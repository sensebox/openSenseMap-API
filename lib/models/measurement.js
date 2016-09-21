'use strict';
var mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema,
  Honeybadger = require('../utils').Honeybadger;

var measurementSchema = new Schema({
  value: {
    type: String,
    required: true
  },
  sensor_id: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true
  }
});
measurementSchema.plugin(timestamp);
measurementSchema.index({ sensor_id: 1, createdAt: -1 });

measurementSchema.statics.initMeasurement = function (sensorId, value, createdAt) {
  // check if second parameter is an array
  if (Array.isArray(value)) {
    createdAt = value[1];
    value = value[0];
  }

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

  return new this(measurementData);
};

// http://stackoverflow.com/a/23453651
function sanitizeString (str) {
  str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, '');
  return str.trim();
}

var measurementModel = mongoose.model('Measurement', measurementSchema);

module.exports = {
  schema: measurementSchema,
  model: measurementModel
};
