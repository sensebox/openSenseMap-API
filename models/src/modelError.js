'use strict';

// taken from https://stackoverflow.com/a/35966534
const { inherits } = require('util');

const ModelError = function ModelError (message, data) {
  Error.captureStackTrace(this, ModelError);
  this.name = ModelError.name;
  this.data = data;
  this.message = message;
};

inherits(ModelError, Error);

module.exports = ModelError;
