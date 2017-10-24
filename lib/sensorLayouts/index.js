'use strict';

const senseboxhome = require('./sensebox.home'),
  senseboxhome_feinstaub = require('./sensebox.home.feinstaub'),
  luftdaten_sds011 = require('./luftdaten/sds011'),
  luftdaten_sds011_dht11 = require('./luftdaten/sds011.dht11'),
  luftdaten_sds011_dht22 = require('./luftdaten/sds011.dht22'),
  luftdaten_sds011_bmp180 = require('./luftdaten/sds011.bmp180'),
  luftdaten_sds011_bme280 = require('./luftdaten/sds011.bme280'),
  luftdaten_pmsx003 = require('./luftdaten/pmsx003'),
  luftdaten_pmsx003_bme280 = require('./luftdaten/pmsx003.bme280'),
  addonFeinstaub = require('./addons/feinstaubAddon');

/*
 * How to add a new senseBox model?
 *
 * - If neccesary, add new sensor definitions to the folder sensorDefinitions.
 * - Add a new file with an array containing required sensors from the sensorDefinitons
 *   in the module.exports.
 * - Add the model here as new entry to modelDefinitions with the string saved in the database as key
 *   and the sensors as value.
 */

const modelDefinitions = {
  'homeEthernet': senseboxhome,
  'homeWifi': senseboxhome,
  'homeEthernetFeinstaub': senseboxhome_feinstaub,
  'homeWifiFeinstaub': senseboxhome_feinstaub,
  'luftdaten_sds011': luftdaten_sds011,
  'luftdaten_sds011_dht11': luftdaten_sds011_dht11,
  'luftdaten_sds011_dht22': luftdaten_sds011_dht22,
  'luftdaten_sds011_bmp180': luftdaten_sds011_bmp180,
  'luftdaten_sds011_bme280': luftdaten_sds011_bme280,
  'luftdaten_pmsx003': luftdaten_pmsx003,
  'luftdaten_pmsx003_bme280': luftdaten_pmsx003_bme280
};

const addonDefinitions = {
  'feinstaub': addonFeinstaub
};

const getSensorsForModel = function getSensorsForModel (model) {
  return modelDefinitions[model];
};

const getSensorsForAddon = function getSensorsForAddon (addon) {
  return addonDefinitions[addon];
};

module.exports = {
  getSensorsForModel,
  getSensorsForAddon,
  addons: Object.keys(addonDefinitions),
  models: Object.keys(modelDefinitions)
};
