'use strict';

const { sps30_pm10, sps30_pm25, sps30_pm1, sht3x_temperature, sht3x_humidity } = require('../sensorDefinitions');

module.exports = [
  sht3x_temperature,
  sht3x_humidity,
  sps30_pm1,
  sps30_pm25,
  sps30_pm10
];
