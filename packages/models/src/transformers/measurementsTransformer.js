'use strict';

const { parseTimestamp } = require('../utils');

const measurementTransformer = function (columns, sensors, { parseTimestamps, parseValues } = {}) {
  return function (data) {
    const theData = {
      createdAt: data.createdAt,
      value: data.value
    };

    const originalMeasurementLocation = {};
    if (data.location) {
      const { coordinates: [lon, lat, height] } = data.location;
      Object.assign(originalMeasurementLocation, { lon, lat, height });
    }

    // add all queried columns to the result
    if (columns && sensors) {
      for (const col of columns) {
        if (theData[col]) {
          continue;
        }

        // assign lon, lat and height from the measurements location if availiable
        // if not, fall back to box location
        if (['lon', 'lat', 'height'].includes(col) && data.location) {
          theData[col] = originalMeasurementLocation[col];
        } else {
          theData[col] = sensors[data.sensor_id][col];
        }
      }
    }

    if (parseTimestamps) {
      theData.createdAt = parseTimestamp(data.createdAt);
    }

    if (parseValues) {
      theData.value = parseFloat(data.value);
    }

    return theData;
  };
};

module.exports = measurementTransformer;
