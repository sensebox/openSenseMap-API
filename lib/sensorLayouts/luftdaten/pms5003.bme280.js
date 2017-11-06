'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pms5003_pm25, pms5003_pm10, pms5003_pm01, bme280_temperature, bme280_humidity, bme280_pressure_pa } = sensorDefinitions;

module.exports = [
  pms5003_pm10,
  pms5003_pm25,
  pms5003_pm01,
  bme280_temperature,
  bme280_humidity,
  bme280_pressure_pa
];
