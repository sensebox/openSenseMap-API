const randomGeojson = require('randomgeojson');
module.exports = function (opts = { model: 'homeEthernet' }) {
  const { bbox, model } = opts;
  const randomGeojsonOptions = { featureTypes: ['Point'] };
  if (bbox) {
    randomGeojsonOptions.bbox = bbox;
  } else {
    randomGeojsonOptions.bbox = [-179, -89, 179, 89];
  }

  return {
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
};
