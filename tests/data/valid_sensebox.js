const apiKey = require('./randomApiKey'),
  randomGeojson = require('randomgeojson');
module.exports = function () {
  return {
    'name': 'senseBox',
    'model': 'homeEthernet',
    'boxType': 'fixed',
    'exposure': 'indoor',
    'orderID': apiKey(),
    'loc': [
      randomGeojson.generateGeoJSON({ featureTypes: ['Point'] }).features[0]
    ],
    'user': {
      'firstname': 'TestBox',
      'lastname': 'TestBoxNachname',
      'email': 'testmail@testmail.mail'
    }
  };
};
