'use strict';

const jsonHandler = require('./jsonHandler'),
  plainHandler = require('./plainHandler'),
  csvHandler = require('./csvHandler'),
  luftdatenHandler = require('./luftdatenHandler'),
  transformAndValidateArray = require('./transformAndValidateArray');

module.exports = {
  'json': jsonHandler,
  'application/json': jsonHandler,
  'application/json; charset=utf-8': jsonHandler,
  'debug_plain': plainHandler,
  'csv': csvHandler,
  'text/csv': csvHandler,
  'luftdaten': luftdatenHandler,
  transformAndValidateArray
};
