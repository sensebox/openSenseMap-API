'use strict';

const jsonHandler = require('./jsonHandler'),
  plainHandler = require('./plainHandler'),
  csvHandler = require('./csvHandler');

module.exports = {
  'json': jsonHandler,
  'application/json': jsonHandler,
  'application/json; charset=utf-8': jsonHandler,
  'debug_plain': plainHandler,
  'csv': csvHandler,
  'text/csv': csvHandler
};
