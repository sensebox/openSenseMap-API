'use strict';

const pino = require('pino');

module.exports = pino({
  name: 'opensensemap-api-models',
  serializers: pino.stdSerializers
});
