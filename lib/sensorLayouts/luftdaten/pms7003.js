'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pms7003_pm25, pms7003_pm10, pms7003_pm01 } = sensorDefinitions;

module.exports = [
  pms7003_pm10,
  pms7003_pm25,
  pms7003_pm01
];
