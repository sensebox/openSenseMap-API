'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pmsx003_pm25, pmsx003_pm10, pmsx003_pm01, bme280_temperature, bme280_humidity, bme280_pressure_pa } = sensorDefinitions;

module.exports = [
  pmsx003_pm10,
  pmsx003_pm25,
  pmsx003_pm01,
  bme280_temperature,
  bme280_humidity,
  bme280_pressure_pa
];
