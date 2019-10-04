'use strict';

const bunyan = require('bunyan');

module.exports = bunyan.createLogger({ name: 'opensensemap-api-models', serializers: bunyan.stdSerializers });
