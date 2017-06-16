'use strict';

const { parseTimestamp, sanitizeString, timeIsValid, isNonEmptyString, utcNowDate } = require('../utils'),
  { mongoose } = require('../db');

const transformAndValidateArray = function (arr) {
  const now = utcNowDate();

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

      if (!isNonEmptyString(elem.sensor_id)) {
        reject(new Error(`missing sensor id for measurement ${JSON.stringify(elem)}`));
      }

      // value
      if (!isNonEmptyString(elem.value)) {
        reject(new Error(`missing value for measurement ${JSON.stringify(elem)}`));
      }
      elem.value = sanitizeString(elem.value.toString());

      // timestamp
      if (typeof elem.createdAt === 'undefined') {
        elem.createdAt = now;
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
