'use strict';

const randomGeojson = require('randomgeojson');
module.exports = function ({ bbox, model, sensors, lonlat, name = '', sensorTemplates } = {}) {
  const randomGeojsonOptions = { featureTypes: ['Point'] };
  let loc;
  if (lonlat) {
    loc = lonlat;
  } else if (bbox) {
    randomGeojsonOptions.bbox = bbox;
  } else {
    randomGeojsonOptions.bbox = [-179, -89, 179, 89];
  }

  if (!loc) {
    loc = randomGeojson.generateGeoJSON(randomGeojsonOptions).features[0].geometry.coordinates;
  }

  if (!sensors && !model) {
    model = 'homeEthernet';
  }

  const box = {
    'name': `senseBox${name}`,
    'model': model,
    'exposure': 'indoor',
    'weblink': 'https://api.opensensemap.org',
    'location': loc,
    'mqtt': {
      'enabled': false,
      'url': '',
      'topic': '',
      'messageFormat': '',
      'decodeOptions': '',
      'connectionOptions': ''
    }
  };
  if (sensors) {
    box.sensors = sensors;
  }

  if (sensorTemplates) {
    box.sensorTemplates = sensorTemplates;
  }

  return box;
};
