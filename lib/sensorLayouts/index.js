'use strict';

const senseboxhome = require('./sensebox.home');

const getSensorsForModel = function getSensorsForModel (model) {
  switch (model) {
  case 'homeEthernet':
  case 'homeWifi':
    return senseboxhome;
  }
};

module.exports = {
  senseboxhome,
  getSensorsForModel
};
