'use strict'

const
  { Box }       = require('@sensebox/opensensemap-api-models'),
  { point }     = require('@turf/helpers'),
  handleError   = require('../helpers/errorHandler'),
  jsonstringify = require('stringify-stream'),
  fs            = require('fs');
  

const geoJsonStringifyReplacer = function geoJsonStringifyReplacer (key, object) {

  // let liveDate = new Date('2020-03-27T14:47:54.186Z').getTime();  //CHANGE THIS TO date.now() for production
  // let liveDate = new Date('2019-11-07T12:59:52Z').getTime();  //CHANGE THIS TO date.now() for production
  let liveDate = new Date.now();
  let newValues = {};

  if(key === 'sensors'){
    object = object.map(sensor => {
      if (sensor && sensor.lastMeasurement) {
        if((new Date(sensor.lastMeasurement.createdAt).getTime() - liveDate ) > 0){
          newValues[sensor.title] = parseFloat(sensor.lastMeasurement.value)
        }
      }
      return null;
    })
    return {live:newValues};  
  }

  if (key === '') {
    const coordinates = object.currentLocation.coordinates;
    object.currentLocation = undefined;
    object.loc = undefined;

    return point(coordinates, object);
  }

  return object
};

const generateGeojson = async function generateGeojson() {

  let now = new Date();
  now.setSeconds(0);
  now.setMilliseconds(0);
  let wstream       = fs.createWriteStream('geojson-data/'+now.toISOString() + '_world.json')

  let stringifier = jsonstringify({ open: '{"type":"FeatureCollection","features":[', close: ']}' }, geoJsonStringifyReplacer);

  try {
    let stream;
    stream = await Box.findBoxesLastMeasurements({full: true});

    stream
      .pipe(stringifier)
      .on('error', function (err) {
        console.log(err);
      })
      .pipe(wstream)
      
  } catch (err) {
    console.log(err);
  }

}

module.exports = {
  generateGeojson: generateGeojson
}