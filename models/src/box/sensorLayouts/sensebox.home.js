'use strict';

const sensorDefinitions = require('./sensorDefinitions');

const { hdc1008_temperature, hdc1008_humidity, bmp280_pressure, tsl45315_lightintensity, veml6070_uvintensity } = sensorDefinitions;

module.exports = [
  hdc1008_temperature,
  hdc1008_humidity,
  bmp280_pressure,
  tsl45315_lightintensity,
  veml6070_uvintensity
];
