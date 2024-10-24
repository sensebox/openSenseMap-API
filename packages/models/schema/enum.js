'use strict';

const { pgEnum } = require('drizzle-orm/pg-core');

const deviceModel = pgEnum('model', [
  'home_v2_lora',
  'home_v2_ethernet',
  'home_v2_ethernet_feinstaub',
  'home_v2_wifi',
  'home_v2_wifi_feinstaub',
  'home_ethernet',
  'home_wifi',
  'home_ethernet_feinstaub',
  'home_wifi_feinstaub',
  'luftdaten_sds011',
  'luftdaten_sds011_dht11',
  'luftdaten_sds011_dht22',
  'luftdaten_sds011_bmp180',
  'luftdaten_sds011_bme280',
  'luftdaten_pms1003',
  'luftdaten_pms1003_bme280',
  'luftdaten_pms3003',
  'luftdaten_pms3003_bme280',
  'luftdaten_pms5003',
  'luftdaten_pms5003_bme280',
  'luftdaten_pms7003',
  'luftdaten_pms7003_bme280',
  'luftdaten_sps30_bme280',
  'luftdaten_sps30_sht3x',
  'hackair_home_v2',
  'custom',
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
