'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { sds011_pm25, sds011_pm10, bme280_temperature, bme280_humidity, bme280_pressure_pa } = sensorDefinitions;

module.exports = [
  sds011_pm10,
  sds011_pm25,
  bme280_temperature,
  bme280_humidity,
  bme280_pressure_pa
];
