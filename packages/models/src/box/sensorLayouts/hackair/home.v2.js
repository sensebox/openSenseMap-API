'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { sds011_pm10, sds011_pm25 } = sensorDefinitions;

module.exports = [
  sds011_pm10,
  sds011_pm25
];
