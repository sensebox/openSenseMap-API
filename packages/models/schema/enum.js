'use strict';

const { pgEnum } = require('drizzle-orm/pg-core');

const deviceModel = pgEnum('model', [
  'HOME_V2_LORA'
]);

const exposure = pgEnum('exposure', [
  'indoor',
  'outdoor',
  'mobile',
  'unknown'
]);

const status = pgEnum('status', [
  'active',
  'inactive',
  'old'
]);

module.exports = {
  deviceModel,
  exposure,
  status
};
