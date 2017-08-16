'use strict';

const { parseAndValidateTimestamp, isNonEmptyString, isNumeric, utcNow } = require('../utils'),
  { mongoose } = require('../db');

const isNumber = function isNumber (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

const transformAndValidateMeasurements = function transformAndValidateMeasurements (arr) {
  const now = utcNow();

  return new Promise(function (resolve, reject) {
    if (arr.length > 2500) {
      return reject(new Error('too many measurements. please submit at most 2500 measurements at once'));
    }

    for (const elem of arr) {
      // check for all the keys

      // sensor/sensor_id
      if (typeof elem.sensor_id === 'undefined' && elem.sensor) {
        elem.sensor_id = elem.sensor.toString().trim();
        elem.sensor = undefined;
      }

      if (!isNonEmptyString(elem.sensor_id)) {
        return reject(new Error(`missing sensor id for measurement ${JSON.stringify(elem)}`));
      }

      // value
      if (!isNonEmptyString(elem.value)) {
        return reject(new Error(`missing value for measurement ${JSON.stringify(elem)}`));
      }

      if (!isNumber(elem.value)) {
        return reject(new Error(`invalid value for measurement ${JSON.stringify(elem)}`));
      }

      try {
      // timestamp
        if (typeof elem.createdAt === 'undefined') {
          elem.createdAt = now;
        } else {
          elem.createdAt = parseAndValidateTimestamp(elem.createdAt);
        }

        // location
        if (elem.location) {
          elem.location = transformAndValidateCoords(elem.location);
        }
      } catch (err) {
        return reject(err);
      }

      // finally attach a mongodb objectId
      elem._id = mongoose.Types.ObjectId();
    }

    return resolve(arr);
  });
};

/**
 * @param {Array|Object} coords The coordinates to validate.
 *        May be either an array [lng,lat,height], or an object
 *        { lat: 1, lng: 2, height: 3 }, where height is optional.
 * @throws If coordinates are missing or out of bounds.
 * @returns {Array} Array [lng,lat,height], if coordinates are valid.
 */
const transformAndValidateCoords = function transformAndValidateCoords (coords) {
  let { lng, lat, height } = coords || {};
  if (Array.isArray(coords)) {
    [ lng, lat, height ] = coords;
  }

  if (!isNumeric(lng) || !isNumeric(lat)) {
    throw new Error(`missing latitude or longitude in location ${JSON.stringify(coords)}`);
  }

  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    throw new Error(`latitude or longitude is out of bounds in location ${coords}`);
  }

  // return as array, truncate to 6 decimals
  const result = [
    Math.round(lng * 10e6) / 10e6,
    Math.round(lat * 10e6) / 10e6
  ];

  if (isNumeric(height)) {
    result.push(Math.round(height * 10e3) / 10e3);
  }

  return result;
};

module.exports = {
  transformAndValidateMeasurements,
  transformAndValidateCoords
};
