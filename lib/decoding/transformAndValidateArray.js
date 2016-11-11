'use strict';

let utils = require('../utils'),
  parseTimestamp = utils.parseTimestamp,
  sanitizeString = utils.sanitizeString,
  timeIsValid = utils.timeIsValid,
  mongoose = require('mongoose');

let transformAndValidateArray = function (arr) {
  if (arr.length > 2500) {
    throw new Error('too many measurements. please submit at most 2500 measurements at once');
  }
  return arr.map(function (elem) {
    // check for all the keys

    // sensor/sensor_id
    if (typeof elem.sensor_id === 'undefined' && elem.sensor) {
      elem.sensor_id = elem.sensor.toString().trim();
      elem.sensor = undefined;
    }

    if (typeof elem.sensor_id === 'undefined' || elem.sensor_id === '') {
      throw new Error('missing sensor id for measurement ' + JSON.stringify(elem));
    }

    // value
    if (typeof elem.value === 'undefined' || elem.value.toString().trim() === '') {
      throw new Error('missing value for measurement ' + JSON.stringify(elem));
    }
    elem.value = sanitizeString(elem.value.toString());

    // timestamp
    if (typeof elem.createdAt === 'undefined') {
      elem.createdAt = utils.utcNowDate();
    } else {
      let parsedTime = parseTimestamp(elem.createdAt.toString());
      if (timeIsValid(parsedTime)) {
        elem.createdAt = parsedTime.toDate();
      } else {
        throw new Error('given timestamp \'' + elem.createdAt + '\' is invalid or too far into the future. Measurement: ' + JSON.stringify(elem));
      }
    }

    // finally attach a mongodb objectId
    elem._id = mongoose.Types.ObjectId();

    return elem;
  });
};

module.exports = transformAndValidateArray;
