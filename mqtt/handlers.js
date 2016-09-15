'use strict';

let jsonHandler = require('./jsonHandler'),
  plainHandler = require('./plainHandler'),
  csvHandler = require('./csvHandler')

module.exports = {
  'json': jsonHandler,
  'debug_plain': plainHandler,
  'csv': csvHandler
};
