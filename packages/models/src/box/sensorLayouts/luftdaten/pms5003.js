'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pms5003_pm25, pms5003_pm10, pms5003_pm01 } = sensorDefinitions;

module.exports = [
  pms5003_pm01,
  pms5003_pm25,
  pms5003_pm10
];
