'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { pmsx003_pm25, pmsx003_pm10, pmsx003_pm01 } = sensorDefinitions;

module.exports = [
  pmsx003_pm10,
  pmsx003_pm25,
  pmsx003_pm01
];
