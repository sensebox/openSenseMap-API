'use strict';

const {
  hdc1008_temperature,
  hdc1008_humidity,
  bmp280_pressure,
  tsl45315_lightintensity,
  veml6070_uvintensity,
  sds011_pm10,
  sds011_pm25
} = require('./sensorDefinitions');


module.exports = [
  hdc1008_temperature,
  hdc1008_humidity,
  bmp280_pressure,
  tsl45315_lightintensity,
  veml6070_uvintensity,
  sds011_pm10,
  sds011_pm25
];
