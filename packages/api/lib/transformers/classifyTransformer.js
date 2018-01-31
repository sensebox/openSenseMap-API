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

  this.now = moment.utc();
  this.sevenDays = this.now.clone().subtract(7, 'days');
  this.thirtyDays = this.now.clone().subtract(30, 'days');

  Transform.call(this, streamOptions);
};

classifyTransformer.prototype._transform = function _transform (data, encoding, callback) {
  const box = data;
  let state = 'old';

  for (const sensor of box.sensors) {
    if (!sensor.lastMeasurement || !sensor.lastMeasurement.createdAt) {
      break;
    }

    const lastMeasurementCreatedAt = moment.utc(sensor.lastMeasurement.createdAt);

    if (lastMeasurementCreatedAt.isAfter(this.sevenDays)) {
      state = 'active';
      break;
    }

    if (lastMeasurementCreatedAt.isBetween(this.thirtyDays, this.sevenDays))
    {
      state = 'inactive';
    }
  }

  box['state'] = state;
  this.push(box);
  callback();
};

inherits(classifyTransformer, Transform);

module.exports = classifyTransformer;
