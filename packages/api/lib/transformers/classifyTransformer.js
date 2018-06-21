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

  if (box.updatedAt > this.thirtyDays) {
    state = 'inactive';
  } else if (box.updatedAt > this.sevenDays) {
    state = 'active';
  }

  box['state'] = state;
  this.push(box);
  callback();
};

inherits(classifyTransformer, Transform);

module.exports = classifyTransformer;
