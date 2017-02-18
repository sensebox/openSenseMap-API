const randomGeojson = require('randomgeojson');
module.exports = function (bbox) {
  const randomGeojsonOptions = { featureTypes: ['Point'] };
  if (bbox) {
    randomGeojsonOptions.bbox = bbox;
  } else {
    randomGeojsonOptions.bbox = [-179, -89, 179, 89];
  }

  return {
    'name': 'senseBox',
    'model': 'homeEthernet',
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
