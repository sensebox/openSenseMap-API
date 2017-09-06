'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { sds011_pm25, sds011_pm10, dht22_temperature, dht22_humidity } = sensorDefinitions;

module.exports = [
  sds011_pm10,
  sds011_pm25,
  dht22_temperature,
  dht22_humidity
];

