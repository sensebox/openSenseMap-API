'use strict';

const Transform = require('stream').Transform,
  inherits = require('util').inherits;

const ONE_DAY = 1000 * 60 * 60 * 24;
const SEVEN_DAYS = ONE_DAY * 7;
const THIRTY_DAYS = ONE_DAY * 30;

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
    const now = Date.now();
    const sortedSensors = filteredSensorsWithMeasurements.sort(function (a, b) {
      const c = new Date(a.lastMeasurement.createdAt);
      const d = new Date(b.lastMeasurement.createdAt);

      if (c > d) { return -1; }
      if (c < d) { return 1; }

      return 0;
    });

    if (now - sortedSensors[0].lastMeasurement.createdAt < SEVEN_DAYS) {
      state = 'active';
    }

    if (now - sortedSensors[0].lastMeasurement.createdAt < THIRTY_DAYS &&
      now - sortedSensors[0].lastMeasurement.createdAt > SEVEN_DAYS)
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
  if (this._hasData) {
    this.push('{"code":"NotFound","messages":"no boxes found"}');
    done();
  } else {
    done();
  }
};

inherits(classifyTransformer, Transform);

module.exports = classifyTransformer;
