'use strict';

const senseboxhome = require('./sensebox.home'),
  senseboxhome_feinstaub = require('./sensebox.home.feinstaub'),
  senseboxhome_v2 = require('./sensebox.home.mcu'),
  luftdaten_sds011 = require('./luftdaten/sds011'),
  luftdaten_sds011_dht11 = require('./luftdaten/sds011.dht11'),
  luftdaten_sds011_dht22 = require('./luftdaten/sds011.dht22'),
  luftdaten_sds011_bmp180 = require('./luftdaten/sds011.bmp180'),
  luftdaten_sds011_bme280 = require('./luftdaten/sds011.bme280'),
  luftdaten_pms1003 = require('./luftdaten/pms1003'),
  luftdaten_pms1003_bme280 = require('./luftdaten/pms1003.bme280'),
  luftdaten_pms3003 = require('./luftdaten/pms3003'),
  luftdaten_pms3003_bme280 = require('./luftdaten/pms3003.bme280'),
  luftdaten_pms5003 = require('./luftdaten/pms5003'),
  luftdaten_pms5003_bme280 = require('./luftdaten/pms5003.bme280'),
  luftdaten_pms7003 = require('./luftdaten/pms7003'),
  luftdaten_pms7003_bme280 = require('./luftdaten/pms7003.bme280'),
  hackair_home_v2 = require('./hackair/home.v2'),
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
  'homeV2GSM': senseboxhome_v2,
  'homeV2Lora': senseboxhome_v2,
  'homeV2Ethernet': senseboxhome_v2,
  'homeV2EthernetFeinstaub': senseboxhome_v2,
  'homeV2Wifi': senseboxhome_v2,
  'homeV2WifiFeinstaub': senseboxhome_v2,
  'homeEthernet': senseboxhome,
  'homeWifi': senseboxhome,
  'homeEthernetFeinstaub': senseboxhome_feinstaub,
  'homeWifiFeinstaub': senseboxhome_feinstaub,
  'luftdaten_sds011': luftdaten_sds011,
  'luftdaten_sds011_dht11': luftdaten_sds011_dht11,
  'luftdaten_sds011_dht22': luftdaten_sds011_dht22,
  'luftdaten_sds011_bmp180': luftdaten_sds011_bmp180,
  'luftdaten_sds011_bme280': luftdaten_sds011_bme280,
  'luftdaten_pms1003': luftdaten_pms1003,
  'luftdaten_pms1003_bme280': luftdaten_pms1003_bme280,
  'luftdaten_pms3003': luftdaten_pms3003,
  'luftdaten_pms3003_bme280': luftdaten_pms3003_bme280,
  'luftdaten_pms5003': luftdaten_pms5003,
  'luftdaten_pms5003_bme280': luftdaten_pms5003_bme280,
  'luftdaten_pms7003': luftdaten_pms7003,
  'luftdaten_pms7003_bme280': luftdaten_pms7003_bme280,
  'hackair_home_v2': hackair_home_v2
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
