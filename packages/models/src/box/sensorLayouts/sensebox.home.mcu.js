'use strict';

const sensorDefinitions = require('./sensorDefinitions');

const {
  hdc1080_temperature,
  hdc1080_humidity,
  bmp280_pressure,
  tsl45315_lightintensity,
  veml6070_uvintensity,
  sds011_pm10,
  sds011_pm25,
  bme680_humidity,
  bme680_temperature,
  bme680_pressure,
  bme680_voc,
  smt50_soilmoisture,
  smt50_soiltemperature,
  soundlevelmeter,
  windspeed,
  scd30_co2,
  dps310_pressure
} = sensorDefinitions;

module.exports = [
  hdc1080_temperature,
  hdc1080_humidity,
  bmp280_pressure,
  tsl45315_lightintensity,
  veml6070_uvintensity,
  sds011_pm10,
  sds011_pm25,
  bme680_humidity,
  bme680_temperature,
  bme680_pressure,
  bme680_voc,
  smt50_soilmoisture,
  smt50_soiltemperature,
  soundlevelmeter,
  windspeed,
  scd30_co2,
  dps310_pressure,
];
