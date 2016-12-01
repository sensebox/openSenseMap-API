const apiKey = require('./randomApiKey'),
  randomGeojson = require('randomgeojson');
module.exports = function (bbox) {
  const randomGeojsonOptions = { featureTypes: ['Point'] };
  if (bbox) {
    randomGeojsonOptions.bbox = bbox;
  }
  return {
    'name': 'senseBox',
    'model': 'homeEthernet',
    'boxType': 'fixed',
    'exposure': 'indoor',
    'orderID': apiKey(),
    'loc': [
      randomGeojson.generateGeoJSON(randomGeojsonOptions).features[0]
    ],
    'user': {
      'firstname': 'TestBox',
      'lastname': 'TestBoxNachname',
      'email': 'testmail@testmail.mail'
    },
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
