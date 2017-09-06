'use strict';

const { sds011_pm25, sds011_pm10 } = require('../sensorDefinitions');

module.exports = [
  sds011_pm10,
  sds011_pm25
];
