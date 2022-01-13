'use strict';

const randomGeojson = require('randomgeojson');

const randomGeojsonOptions = { featureTypes: ['Point'] };

const loc = function loc ({ bbox, loc }) {
  if (bbox) {
    randomGeojsonOptions.bbox = bbox;
  } else {
    randomGeojsonOptions.bbox = [-179, -89, 179, 89];
  }

  if (!loc) {
    loc = randomGeojson.generateGeoJSON(randomGeojsonOptions).features[0].geometry.coordinates;
  }

  return loc;
};


const senseBox = function senseBox ({
  name = 'testSensebox',
  location = {},
  grouptag,
  exposure = 'indoor',
  model = 'homeEthernet',
  sensors,
  mqtt,
  ttn
} = {}) {
  location = loc(location);

  if (sensors) {
    model = undefined;
  }

  return {
    name,
    location,
    grouptag,
    exposure,
    model,
    sensors,
    mqtt,
    ttn
  };
};

module.exports = senseBox;
