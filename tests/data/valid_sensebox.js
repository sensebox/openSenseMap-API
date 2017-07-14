const randomGeojson = require('randomgeojson');
module.exports = function ({ bbox, model, sensors, lonlat } = {}) {
  const randomGeojsonOptions = { featureTypes: ['Point'] };
  let loc;
  if (lonlat) {
    loc = [{ 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'Point', 'coordinates': lonlat } }];
  } else if (bbox) {
    randomGeojsonOptions.bbox = bbox;
  } else {
    randomGeojsonOptions.bbox = [-179, -89, 179, 89];
  }

  if (!loc) {
    loc = [ randomGeojson.generateGeoJSON(randomGeojsonOptions).features[0] ];
  }


  if (!sensors && !model) {
    model = 'homeEthernet';
  }

  const box = {
    'name': 'senseBox',
    'model': model,
    'boxType': 'fixed',
    'exposure': 'indoor',
    'weblink': 'https://api.opensensemap.org',
    'loc': loc,
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

  return box;
};
