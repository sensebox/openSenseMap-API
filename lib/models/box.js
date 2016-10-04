'use strict';
var mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema,
  sensorSchema = require('./sensor').schema,
  products = require('../../products'),
  mqttClient = require('../mqtt'),
  Measurement = require('./measurement').model,
  parseTimestamp = require('../utils');

//Location schema
var LocationSchema = new Schema({
  type: {
    type: String,
    required: true,
    default: 'Feature',
    enum: ['Feature', 'feature']
  },
  geometry: {
    type: {
      type: String,
      required: true,
      default: 'Point',
      enum: ['Point', 'point']
    },
    coordinates: {
      type: Array,
      required: true
    }
  },
  properties: Schema.Types.Mixed
});
LocationSchema.index({ 'geometry': '2dsphere' });

//senseBox schema
var boxSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  loc: {
    type: [LocationSchema],
    required: true
  },
  boxType: {
    type: String,
    required: true
  },
  exposure: {
    type: String,
    required: false
  },
  grouptag: {
    type: String,
    required: false
  },
  model: {
    type: String,
    required: false
  },
  weblink: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  sensors: [sensorSchema]
},{ strict: false });
boxSchema.plugin(timestamp);

boxSchema.add({
  mqtt: {
    url: { type: String, trim: true },
    topic: { type: String, trim: true },
    messageFormat: { type: String, trim: true, enum: ['json', 'csv', 'application/json', 'text/csv', 'debug_plain'] }, // Future: 'plain', 'csv'
    decodeOptions: { type: String, trim: true },
    connectionOptions: { type: String, trim: true }
  }
});

boxSchema.statics.newFromRequest = function (req) {
  var boxData = {
    name: req.params.name,
    boxType: req.params.boxType,
    loc: req.params.loc,
    grouptag: req.params.tag,
    exposure: req.params.exposure,
    _id: mongoose.Types.ObjectId(),
    model: req.params.model,
    sensors: req.params.sensors,
    mqtt: req.params.mqtt
  };

  // if model is not empty, get sensor definitions from products
  // otherwise, req.params.sensors should not be empty
  if (req.params.model) {
    switch (req.params.model) {
    case 'homeEthernet':
      boxData.sensors = products.senseboxhome;
      break;
    case 'homeWifi':
      boxData.sensors = products.senseboxhome;
      break;
    case 'basicEthernet':
      boxData.sensors = products.senseboxbasic;
      break;
    default:
      break;
    }
  }

  // assign sensors an mongodb objectid
  for (var i = boxData.sensors.length - 1; i >= 0; i--) {
    boxData.sensors[i] = Object.assign(boxData.sensors[i], { _id: mongoose.Types.ObjectId() });
  }

  return new this(boxData);
};

boxSchema.statics.connectMQTTBoxes = function () {
  this.where('mqtt').exists(true).exec()
    .then(function (mqttBoxes) {
      mqttBoxes.forEach(mqttClient.connect);
    });
};

// handles only json for now..
// accepts an object with sensor ids as keys
boxSchema.methods.saveMeasurements = function (measurements) {
  let box = this,
    qrys = [];

  if (!measurements) {
    return Promise.reject('cannot save empty or invalid measurements');
  }

  try {
    box.sensors.forEach(function (sensor, i) {
      if (typeof measurements[sensor._id] !== 'undefined') {
        let measurement = Measurement.initMeasurement(sensor._id, measurements[sensor._id]);
        box.sensors[i].lastMeasurement = measurement._id;
        // add one box save query if neccessary
        if (qrys.length === 0) {
          qrys.push(box.save());
        }
        qrys.push(measurement.save());
      }
    });
    if (qrys.length !== 0) {
      return Promise.all(qrys);
    } else {
      return Promise.reject('no matching sensor');
    }
  } catch (e) {
    return Promise.reject(e);
  }
};

boxSchema.methods.saveMeasurement = function (sensorId, value, createdAt) {
  var box = this;
  for (var i = box.sensors.length - 1; i >= 0; i--) {
    if (box.sensors[i]._id.equals(sensorId)) {
      var measurement = Measurement.initMeasurement(sensorId, value, createdAt);

      box.sensors[i].lastMeasurement = measurement._id;
      return Promise.all([
        box.save(),
        measurement.save()
      ]);
    } else if (i === 0) { // the loop iterates down. if i is zero, no sensor was found with this id in the box
      return Promise.reject('sensor not found');
    }
  }
};

boxSchema.methods.saveMeasurementArray = function (data) {
  var box = this;
  if (!Array.isArray(data)) {
    return Promise.reject('array expected');
  }

  if (data.length > 2000) {
    return Promise.reject('array too big. Please stay below 2000 items');
  }

  var qrys = [];
  data.forEach(function (measurement) {
    for (var i = box.sensors.length - 1; i >= 0; i--) {
      if (box.sensors[i]._id.equals(measurement.sensor)) {
        var mongoMeasurement = Measurement.initMeasurement(measurement.sensor, measurement.value, measurement.createdAt);

        box.sensors[i].lastMeasurement = mongoMeasurement._id;
        // add one box save query if neccessary
        if (qrys.length === 0) {
          qrys.push(box.save());
        }
        qrys.push(mongoMeasurement.save());
      }
    }
  });
  return Promise.all(qrys);
};

boxSchema.methods.sensorIds = function () {
  let sensorIds = [];
  for (let i = this.sensors.length - 1; i >= 0; i--) {
    sensorIds.push(this.sensors[i]._id.toString());
  }
  return sensorIds;
};

boxSchema.methods.saveMeasurementsArray = function (measurements) {
  let box = this;

  if (!measurements) {
    return Promise.reject('cannot save empty or invalid measurements');
  }

  if (!Array.isArray(measurements)) {
    return Promise.reject('array expected');
  }

  let sensorIds = this.sensorIds(),
    lastMeasurements = {};

  // check if all measurements belong to this box
  for (let measurement of measurements) {
    if (sensorIds.indexOf(measurement.sensor_id) === -1) {
      return Promise.reject('measurement for sensor with id ' + measurement.sensor_id + ' does not belong to box');
    }

    if (!lastMeasurements[measurement.sensor_id]) {
      lastMeasurements[measurement.sensor_id] = measurement;
    } else {
      let ts = parseTimestamp(measurement.createdAt),
        previous_ts = parseTimestamp(lastMeasurements[measurement.sensor_id].createdAt);
      if (ts.isAfter(previous_ts)) {
        lastMeasurements[measurement.sensor_id] = measurement;
      }
    }
  }

  return Measurement.insertMany(measurements)
    .then(function () {
      // set lastMeasurementIds..
      for (let sensor of box.sensors) {
        if (lastMeasurements[sensor._id]) {
          sensor.lastMeasurement = lastMeasurements[sensor._id]._id;
        }
      }

      //save the box
      return box.save();
    });
};

let checkMqttChanged = function (next) {
  this._mqttChanged = this.modifiedPaths().some(function (path) {
    return path.indexOf('mqtt') !== -1;
  });
  next();
};

let reconnectMqttOnChanged = function (box) {
  if (box._mqttChanged === true) {
    console.log('mqtt credentials changed, reconnecting');
    mqttClient.connect(box);
    box._mqttChanged = undefined;
  }
};

boxSchema.pre('save', checkMqttChanged);
boxSchema.pre('update', checkMqttChanged);

boxSchema.post('save', reconnectMqttOnChanged);
boxSchema.post('update', reconnectMqttOnChanged);

boxSchema.pre('remove', function (next) {
  mqttClient.disconnect(this);
  next();
});

var boxModel = mongoose.model('Box', boxSchema);

module.exports = {
  schema: boxSchema,
  model: boxModel
};
