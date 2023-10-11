'use strict';

const { bme280_humidity, bme280_temperature, bme280_pressure_pa, sps30_pm1, sps30_pm10, sps30_pm25 } = require('../sensorDefinitions');

module.exports = [
  sps30_pm1,
  sps30_pm25,
  sps30_pm10,
  bme280_temperature,
  bme280_humidity,
  bme280_pressure_pa
];
