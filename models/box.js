'use strict';
var mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema,
  sensorSchema = require('./sensor').schema,
  products = require('../products'),
  mqttClient = require('../mqtt'),
  Measurement = require('./measurement').model,
  Honeybadger = require('../utils').Honeybadger;

//Location schema
var LocationSchema = new Schema({
  type: {
    type: String,
    required: true,
    default: 'Feature'
  },
  geometry: {
    type: {
      type: String,
      required: true,
      default: 'Point'
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
    topic: { type: String, trim: true }
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
  console.log("connect mqtt");
  this.where('mqtt').exists(true).exec()
    .then(function (mqttBoxes) {
      console.log(mqttBoxes);
      mqttBoxes.forEach(mqttClient.initConnection);
    });
};

boxSchema.methods.saveMeasurement = function (sensorId, value, createdAt) {
  var box = this;
  for (var i = box.sensors.length - 1; i >= 0; i--) {
    if (box.sensors[i]._id.equals(sensorId)) {
      // sanitize user input a little
      if (typeof value === 'string') {
        value = sanitizeString(value);
      }

      var measurementData = {
        value: value,
        _id: mongoose.Types.ObjectId(),
        sensor_id: sensorId
      };

      if (typeof createdAt !== 'undefined') {
        try {
          measurementData.createdAt = new Date(createdAt);
        } catch (e) {
          Honeybadger.notify(e);
          return Promise.reject(e);
        }
      }

      var measurement = new Measurement(measurementData);

      box.sensors[i].lastMeasurement = measurement._id;
      var qrys = [
        box.save(),
        measurement.save()
      ];
      return Promise.all(qrys);
    } else if (i === 0) {
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
        // sanitize user input a little
        if (typeof measurement.value === 'string') {
          measurement.value = sanitizeString(measurement.value);
        }
        var measurementData = {
          value: measurement.value,
          _id: mongoose.Types.ObjectId(),
          sensor_id: measurement.sensor
        };

        if (typeof measurement.createdAt !== 'undefined') {
          try {
            measurementData.createdAt = new Date(measurement.createdAt);
          } catch (e) {
            Honeybadger.notify(e);
            return Promise.reject(e);
          }
        }

        var mongoMeasurement = new Measurement(measurementData);

        box.sensors[i].lastMeasurement = mongoMeasurement._id;
        qrys.push(box.save());
        qrys.push(mongoMeasurement.save());
      }
    }
  });
  return Promise.all(qrys);
};

// http://stackoverflow.com/a/23453651
function sanitizeString (str) {
  str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, '');
  return str.trim();
}

var boxModel = mongoose.model('Box', boxSchema);

module.exports = {
  schema: boxSchema,
  model: boxModel
};
