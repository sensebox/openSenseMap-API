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
  this.sevenDays = this.now.clone().subtract(7, 'days')
    .toDate();
  this.thirtyDays = this.now.clone().subtract(30, 'days')
    .toDate();

  Transform.call(this, streamOptions);
};

classifyTransformer.prototype._transform = function _transform (box, encoding, callback) {
  let state = 'old';

  const lastMeasurementCreatedAt = box.lastMeasurementAt;

  if (lastMeasurementCreatedAt > this.sevenDays) {
    state = 'active';
  } else if (lastMeasurementCreatedAt > this.thirtyDays) {
    state = 'inactive';
  }

  box['state'] = state;
  this.push(box);
  callback();
};

inherits(classifyTransformer, Transform);

module.exports = classifyTransformer;
