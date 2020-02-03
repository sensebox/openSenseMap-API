'use strict';

const { transformAndValidateMeasurements } = require('./validators');

/**
 * Transforms JSON produced by hackair.eu devices to openSenseMap compatible JSON.
 * It looks for the items in the `readings` object and tries to match its `keys`
 * to a sensors title.
 *
 * Example in JSON:
 *    {
 *      "reading": {
 *        "PM2.5_AirPollutantValue": "7.93",
 *        "PM10_AirPollutantValue": "32.63",
 *        "Temperature_Value": "21.60",
 *        "Humidity_Value":"80.10"
 *      },
 *      "battery": "5.99",
 *      "tamper": "0",
 *      "error": "4"
 *    }
 *
 * Example out JSON:
 * [
 *   {"sensor_id": "sensorID", "value":"value" },
 *   ...
 * ]
 *
 */

const matchings = {
  pm10: ['pm10', 'p10', 'p1'],
  pm25: ['pm2.5', 'pm25', 'p2.5', 'p25', 'p2'],
  temperature: ['temperatur'],
  humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'luftfeuchte']
};

const findSensorId = function findSensorId (sensors, reading) {
  // temperature, humidity and pressure values
  // are named either directly or with a prefix
  // separated by underscores. The last element
  // should be the the desired phenomenon
  const [vt_sensortype] = reading
    .toLowerCase()
    .replace('.', '')
    .split('_');

  if (matchings[vt_sensortype]) {
    let sensorId;

    for (const sensor of sensors) {
      const title = sensor.title.toLowerCase();
      if (
        (title === vt_sensortype || matchings[vt_sensortype].includes(title) || matchings[vt_sensortype].some(alias => title.includes(alias)))
      ) {
        sensorId = sensor._id.toString();
        break;
      }
    }

    return sensorId;
  }
};

const transformHackairJson = function transformHackairJson (json, sensors) {
  const outArray = [];

  for (const rd in json.reading) {
    if (Object.prototype.hasOwnProperty.call(json.reading, rd)) {
      const value = json.reading[rd];
      const sensor_id = findSensorId(sensors, rd);
      if (sensor_id) {
        outArray.push({ sensor_id, value });
      }
    }
  }

  return outArray;
};


module.exports = {
  decodeMessage: function (message, { sensors } = {}) {
    if (!sensors) {
      return Promise.reject(new Error('hackair handler needs sensors'));
    }

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
          return Promise.reject(err);
        }
      }

      if (!json.reading) {
        return Promise.reject(new Error('Invalid hackair json. Missing `readings`'));
      }

      const transformedMeasurements = transformHackairJson(json, sensors);
      if (transformedMeasurements.length === 0) {
        return Promise.reject(new Error('No applicable values found'));
      }

      return transformAndValidateMeasurements(transformedMeasurements);
    }

    return Promise.reject(new Error('Cannot decode empty message (hackair decoder)'));
  }
};
