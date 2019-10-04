'use strict';

const sensorDefinitions = require('./sensorDefinitions');

const {
  hdc1080_temperature,
  hdc1080_humidity,
  bmp280_pressure,
  tsl45315_lightintensity,
  veml6070_uvintensity,
  sds011_pm10,
  sds011_pm25
} = sensorDefinitions;

module.exports = [
  hdc1080_temperature,
  hdc1080_humidity,
  bmp280_pressure,
  tsl45315_lightintensity,
  veml6070_uvintensity,
  sds011_pm10,
  sds011_pm25
];
