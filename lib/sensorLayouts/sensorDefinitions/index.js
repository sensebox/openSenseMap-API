'use strict';

const veml6070_uvintensity = require('./veml6070_uvintensity'),
  tsl45315_lightintensity = require('./tsl45315_lightintensity'),
  bmp280_pressure = require('./bmp280_pressure'),
  hdc1008_humidity = require('./hdc1008_humidity'),
  hdc1008_temperature = require('./hdc1008_temperature');

module.exports = {
  hdc1008_temperature,
  hdc1008_humidity,
  bmp280_pressure,
  tsl45315_lightintensity,
  veml6070_uvintensity
};
