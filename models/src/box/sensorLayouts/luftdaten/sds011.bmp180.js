'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { sds011_pm25, sds011_pm10, bmp180_temperature, bmp180_pressure_pa } = sensorDefinitions;

module.exports = [
  sds011_pm10,
  sds011_pm25,
  bmp180_temperature,
  bmp180_pressure_pa
];
