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
  dps310_pressure,
  sps30_pm1,
  sps30_pm25,
  sps30_pm4,
  sps30_pm10
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
  sps30_pm1,
  sps30_pm25,
  sps30_pm4,
  sps30_pm10
];
