'use strict';

// enable the no config warning suppression to enable the use of this package
// where no node-config ist available
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';

const config = require('config');

config.util.setModuleDefaults('openSenseMap-API-models', {
  'db': {
    'host': 'localhost',
    'port': 27017,
    'user': 'admin',
    'userpass': 'admin',
    'authsource': 'OSeM-api',
    'db': 'OSeM-api',
    'mongo_uri': ''
  },
  'integrations': {
    'ca_cert': '',
    'mailer': {
      'url': '',
      'cert': '',
      'key': '',
      'origin': ''
    }
  },
  'password': {
    'min_length': 8,
    'salt_factor': 13
  },
  'image_folder': './userimages',
});

const { model: Box } = require('./src/box/box'),
  { model: Measurement } = require('./src/measurement/measurement'),
  { model: Sensor } = require('./src/sensor/sensor'),
  { model: User } = require('./src/user/user'),
  utils = require('./src/utils'),
  decoding = require('./src/measurement/decoding'),
  db = require('./src/db');

module.exports = {
  Box,
  Measurement,
  Sensor,
  User,
  utils,
  decoding,
  db
};
