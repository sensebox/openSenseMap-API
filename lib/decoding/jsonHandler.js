'use strict';

const jsonPath = require('jsonpath'),
  { transformAndValidateMeasurements } = require('./validators'),
  log = require('../log');

/**
 * this decode takes either an object like
 * {
 *   "sensorID": "value",
 *   "anotherSensorID": ["value"]
 *   "sensorID3": ["value", "createdAt as ISO8601-timestamp"],
 *   "sensorID4": ["value", "createdAt as ISO8601-timestamp", "location latlng-object or array"],
 *   ...
 *
 * }
 *
 * or an Array like
 * [
 *   {"sensor":"sensorID", "value":"value"},
 *   {"sensor":"anotherSensorId", "value":"value", "createdAt": "ISO8601-timestamp"}
 *   ...
 * ]
 *
 * and transforms it into the form
 * [
 *   {"sensor_id": "sensorID", "value":"value", "createdAt": JavaScript Date Object },
 *   ...
 * ]
 *
 * When given options like {"jsonPath":"some valid JSONPath"} as second parameter,
 * it extracts the measurments json or array from the given message.
 * This is only used for MQTT so far
 */


// this method does not validate!
const handleJSONObjectMultipleValues = function (obj) {
  const outArray = [];

  // transform into Array
  for (const sensorId of Object.keys(obj)) {
    // construct measurement
    const measurement = { sensor_id: sensorId };
    let value = obj[sensorId];

    // check if the value is an array. First item is the value, second the timestamp
    if (Array.isArray(value)) {
      if (value.length === 1) { // single item measurement
        value = value[0];
      } else if (value.length === 2) { // [value,createdAt]
        measurement.createdAt = value[1];
        value = value[0];
      } else if (value.length === 3) { // [value,createdAt,location]
        measurement.location = value[2];
        measurement.createdAt = value[1];
        value = value[0];
      } else {
        throw new Error(`Array for sensorID '${sensorId}' has an illegal length`);
      }
    }
    // set the value
    measurement.value = value;
    outArray.push(measurement);
  }

  return outArray;
};


module.exports = {
  decodeMessage: function (message, options) {
    if (message) {
      // try to decode the json, or if already a js object
      // use it as given
      let json;
      if (typeof message === 'object') {
        json = message;
      } else {
        try {
          json = JSON.parse(message);
        } catch (err) {
          log.error(err);

          return Promise.reject(err);
        }
      }

      if (typeof json !== 'undefined') {
        // use the root '$' if no jsonPath was specified
        let path = '$';
        if (options && options.jsonPath) {
          path = options.jsonPath;
        }
        // extract the json with jsonPath
        const result = jsonPath.query(json, path, 1);

        if (result && result[0]) {
          let decodedJson = result[0];
          if (!Array.isArray(decodedJson)) {
            decodedJson = handleJSONObjectMultipleValues(decodedJson);
          }

          return transformAndValidateMeasurements(decodedJson);
        }
      }
    }

    return Promise.reject(new Error('Cannot decode empty message (json decoder)'));
  }
};
