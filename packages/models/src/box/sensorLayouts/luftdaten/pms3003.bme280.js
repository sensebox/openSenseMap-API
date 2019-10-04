'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pms3003_pm25, pms3003_pm10, pms3003_pm01, bme280_temperature, bme280_humidity, bme280_pressure_pa } = sensorDefinitions;

module.exports = [
  pms3003_pm01,
  pms3003_pm25,
  pms3003_pm10,
  bme280_temperature,
  bme280_humidity,
  bme280_pressure_pa
];
