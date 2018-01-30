'use strict';

const Transform = require('stream').Transform,
  inherits = require('util').inherits,
  moment = require('moment');

const classifyTransformer = function (classifyTransformerOptions, streamOptions) {
  if (!(this instanceof classifyTransformer)) {
    return new classifyTransformer(classifyTransformerOptions, streamOptions);
  }

  if (!streamOptions) {
    streamOptions = {};
  }
  streamOptions.decodeStrings = false;
  streamOptions.objectMode = true;

  Transform.call(this, streamOptions);
};

classifyTransformer.prototype.defineState = function defineState (data, cb) {
  const box = data;
  let state = 'old';

  const filteredSensorsWithMeasurements = box.sensors.filter(function (sensor) {
    if (sensor.lastMeasurement && sensor.lastMeasurement.createdAt) {
      return sensor;
    }
  });

  if (filteredSensorsWithMeasurements.length === 0) {
    state = 'old';
  } else {
    const now = moment.utc();
    const sortedSensors = filteredSensorsWithMeasurements.sort(function (a, b) {
      const c = moment.utc(a.lastMeasurement.createdAt);
      const d = moment.utc(b.lastMeasurement.createdAt);

      if (c > d) { return -1; }
      if (c < d) { return 1; }

      return 0;
    });

    if (moment.utc(sortedSensors[0].lastMeasurement.createdAt).isAfter(now.clone().subtract(7, 'days'))) {
      state = 'active';
    }

    if (moment.utc(sortedSensors[0].lastMeasurement.createdAt).isAfter(now.clone().subtract(30, 'days')) &&
      moment.utc(sortedSensors[0].lastMeasurement.createdAt).isBefore(now.clone().subtract(7, 'days')))
    {
      state = 'inactive';
    }
  }

  box['state'] = state;
  this.push(box);

  return cb();
};

classifyTransformer.prototype._transform = function _transform (data, encoding, callback) {
  this.defineState(data, callback);
};

classifyTransformer.prototype._flush = function (done) {
  done();
};

inherits(classifyTransformer, Transform);

module.exports = classifyTransformer;
