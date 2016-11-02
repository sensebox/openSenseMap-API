'use strict';
var mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema,
  sensorSchema = require('./sensor').schema,
  products = require('../../products'),
  mqttClient = require('../mqtt'),
  Measurement = require('./measurement').model,
  parseTimestamp = require('../utils').parseTimestamp,
  User = require('./user').model;

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
    messageFormat: { type: String, trim: true, enum: ['json', 'csv', 'application/json', 'text/csv', 'debug_plain'] },
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

const BOX_PROPS_FOR_POPULATION = {
  boxType: 1,
  createdAt: 1,
  exposure: 1,
  grouptag: 1,
  image: 1,
  name: 1,
  updatedAt: 1,
  loc: 1,
  sensors: 1,
};

boxSchema.statics.findAndPopulateBoxById = function (id, opts) {
  let populationProps = {};
  Object.assign(populationProps, BOX_PROPS_FOR_POPULATION);

  if (opts) {
    if (opts.includeSecrets) {
      populationProps.mqtt = 1;
    }
    if (opts.onlyLastMeasurements) {
      populationProps = {
        sensors: 1
      };
    }
  }

  return this.findById(id, populationProps)
    .populate([
      {
        path: 'sensors.lastMeasurement', select: { value: 1, createdAt: 1, _id: 0 }
      },
      {
        path: 'loc', select: { _id: 0 }
      }
    ])
    .lean()
    .exec();
};

boxSchema.methods.saveMeasurement = function (measurement) {
  let box = this;
  for (let i = box.sensors.length - 1; i >= 0; i--) {
    if (box.sensors[i]._id.equals(measurement.sensor_id)) {
      let m = new Measurement(measurement);

      box.sensors[i].lastMeasurement = m._id;
      return Promise.all([
        box.save(),
        m.save()
      ]);
    } else if (i === 0) { // the loop iterates down. if i is zero, no sensor was found with this id in the box
      return Promise.reject('sensor ' + measurement.sensor_id + ' of box ' + box._id + ' not found');
    }
  }
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

boxSchema.statics.deleteBox = function (boxId) {
  var qrys = [];

  this.findById(boxId, function (findboxerr, box) {
    box.sensors.forEach(function (sensor) {
      qrys.push(Measurement.find({ sensor_id: sensor._id }).remove());
    });
    qrys.push(box.remove());
    qrys.push(User.findOneAndRemove({ 'boxes': { '$in': [boxId] } }));
  });

  return Promise.all(qrys);
};

let checkMqttChanged = function (next) {
  if (this.modifiedPaths && typeof this.modifiedPaths === 'function') {
    this._mqttChanged = this.modifiedPaths().some(function (path) {
      return path.indexOf('mqtt') !== -1;
    });
  }
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
