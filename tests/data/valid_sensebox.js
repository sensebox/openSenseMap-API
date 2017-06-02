const randomGeojson = require('randomgeojson');
module.exports = function ({ bbox, model, sensors } = {}) {
  const randomGeojsonOptions = { featureTypes: ['Point'] };
  if (bbox) {
    randomGeojsonOptions.bbox = bbox;
  } else {
    randomGeojsonOptions.bbox = [-179, -89, 179, 89];
  }


  if (!sensors && !model) {
    model = 'homeEthernet';
  }

  const box = {
    'name': 'senseBox',
    'model': model,
    'boxType': 'fixed',
    'exposure': 'indoor',
    'loc': [
      randomGeojson.generateGeoJSON(randomGeojsonOptions).features[0]
    ],
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
