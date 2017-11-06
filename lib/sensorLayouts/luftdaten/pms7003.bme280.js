'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pms7003_pm25, pms7003_pm10, pms7003_pm01, bme280_temperature, bme280_humidity, bme280_pressure_pa } = sensorDefinitions;

module.exports = [
  pms7003_pm10,
  pms7003_pm25,
  pms7003_pm01,
  bme280_temperature,
  bme280_humidity,
  bme280_pressure_pa
];
