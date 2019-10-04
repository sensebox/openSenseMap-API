'use strict';

const sensorDefinitions = require('../sensorDefinitions');

const { sds011_pm25, sds011_pm10, dht11_temperature, dht11_humidity } = sensorDefinitions;

module.exports = [
  sds011_pm10,
  sds011_pm25,
  dht11_temperature,
  dht11_humidity
];
