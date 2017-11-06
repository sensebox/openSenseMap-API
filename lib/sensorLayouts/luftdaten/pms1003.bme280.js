'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pms1003_pm25, pms1003_pm10, pms1003_pm01, bme280_temperature, bme280_humidity, bme280_pressure_pa } = sensorDefinitions;

module.exports = [
  pms1003_pm10,
  pms1003_pm25,
  pms1003_pm01,
  bme280_temperature,
  bme280_humidity,
  bme280_pressure_pa
];
