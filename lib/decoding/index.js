'use strict';

let jsonHandler = require('./jsonHandler'),
  plainHandler = require('./plainHandler'),
  csvHandler = require('./csvHandler');

module.exports = {
  'json': jsonHandler,
  'application/json': jsonHandler,
  'debug_plain': plainHandler,
  'csv': csvHandler,
  'text/csv': csvHandler
};
