const apiKey = require('./randomApiKey')();
module.exports = {
  'name': 'senseBox',
  'model': 'homeEthernet',
  'boxType': 'fixed',
  'exposure': 'indoor',
  'orderID': apiKey,
  'loc': [
    {
      'type': 'feature',
      'geometry': {
        'type': 'Point',
        'coordinates': [
          -39.19921875,
          47.754097979680026
        ]
      }
    }
  ],
  'user': {
    'firstname': 'TestBox',
    'lastname': 'TestBoxNachname',
    'email': 'testmail@testmail.mail'
  }
};
