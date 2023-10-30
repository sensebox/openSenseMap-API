'use strict';

// enable the no config warning suppression to enable the use of this package
// where no node-config ist available
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';

const config = require('config');

config.util.setModuleDefaults('openSenseMap-API-models', {
  db: {
    host: 'localhost',
    port: 27017,
    user: 'admin',
    userpass: 'admin',
    authsource: 'OSeM-api',
    db: 'OSeM-api',
    mongo_uri: '',
  },
  integrations: {
    ca_cert: '',
    cert: '',
    key: '',
    redis: {
      host: '',
      port: 6379,
      username: '',
      password: '',
      db: 0,
    },
    mailer: {
      url: '',
      origin: '',
      queue: 'mails',
    },
    mqtt: {
      url: '',
    },
  },
  password: {
    min_length: 8,
    salt_factor: 13,
  },
  claims_ttl: {
    amount: 1,
    unit: 'd',
  },
  pagination: {
    max_boxes: 3
  },
  image_folder: './userimages/',
});

const { model: Box } = require('./src/box/box'),
  { model: Measurement } = require('./src/measurement/measurement'),
  { model: Sensor } = require('./src/sensor/sensor'),
  { model: User } = require('./src/user/user'),
  { model: Claim } = require('./src/box/claim'),
  utils = require('./src/utils'),
  decoding = require('./src/measurement/decoding'),
  db = require('./src/db');

module.exports = {
  Box,
  Claim,
  Measurement,
  Sensor,
  User,
  utils,
  decoding,
  db
};
