'use strict';

const utils = require('../utils'),
  parseTimestamp = utils.parseTimestamp,
  sanitizeString = utils.sanitizeString,
  timeIsValid = utils.timeIsValid,
  mongoose = require('mongoose');

const transformAndValidateArray = function (arr) {
  return new Promise(function (resolve, reject) {
    if (arr.length > 2500) {
      reject(new Error('too many measurements. please submit at most 2500 measurements at once'));
    }

    for (const elem of arr) {
      // check for all the keys

      // sensor/sensor_id
      if (typeof elem.sensor_id === 'undefined' && elem.sensor) {
        elem.sensor_id = elem.sensor.toString().trim();
        elem.sensor = undefined;
      }

      if (typeof elem.sensor_id === 'undefined' || elem.sensor_id === '') {
        reject(new Error(`missing sensor id for measurement ${JSON.stringify(elem)}`));
      }

      // value
      if (typeof elem.value === 'undefined' || elem.value.toString().trim() === '') {
        reject(new Error(`missing value for measurement ${JSON.stringify(elem)}`));
      }
      elem.value = sanitizeString(elem.value.toString());

      // timestamp
      if (typeof elem.createdAt === 'undefined') {
        elem.createdAt = utils.utcNowDate();
      } else {
        const parsedTime = parseTimestamp(elem.createdAt.toString());
        if (timeIsValid(parsedTime)) {
          elem.createdAt = parsedTime.toDate();
        } else {
          reject(new Error(`given timestamp '${elem.createdAt}' is invalid or too far into the future. Measurement: ${JSON.stringify(elem)}`));
        }
      }

      // finally attach a mongodb objectId
      elem._id = mongoose.Types.ObjectId();
    }

    return resolve(arr);
  });
};

module.exports = transformAndValidateArray;
