'use strict';

const jsonHandler = require('./jsonHandler'),
  plainHandler = require('./plainHandler'),
  csvHandler = require('./csvHandler'),
  luftdatenHandler = require('./luftdatenHandler'),
  { bytesHandler, bytesTimestampHandler } = require('./bytesHandler'),
  { transformAndValidateMeasurements } = require('./validators');

module.exports = {
  'json': jsonHandler,
  'application/json': jsonHandler,
  'application/json; charset=utf-8': jsonHandler,
  'debug_plain': plainHandler,
  'csv': csvHandler,
  'text/csv': csvHandler,
  'luftdaten': luftdatenHandler,
  'application/sbx-bytes': bytesHandler,
  'application/sbx-bytes-ts': bytesTimestampHandler,
  'sbx-bytes': bytesHandler,
  'sbx-bytes-ts': bytesTimestampHandler,
  'transformAndValidateArray': transformAndValidateMeasurements,
};
