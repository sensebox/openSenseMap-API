'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pms1003_pm25, pms1003_pm10, pms1003_pm01 } = sensorDefinitions;

module.exports = [
  pms1003_pm01,
  pms1003_pm25,
  pms1003_pm10
];
