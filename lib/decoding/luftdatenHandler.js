'use strict';

const transformAndValidateArray = require('./transformAndValidateArray');

/**
 * Transforms JSON produced by Luftdaten.info devices to openSenseMap compatible JSON.
 * It looks for the items in the `sensordatavalues` array and tries to match its `value_type`
 * properties to a sensors title.
 *
 * Example in JSON:
 *   {
 *     "software_version": "NRZ-2016-058",
 *     "sensordatavalues": [
 *       {
 *         "value_type": "SDS_P1",
 *         "value": "5.38"
 *       },
 *       {
 *         "value_type": "SDS_P2",
 *         "value": "4.98"
 *       },
 *       {
 *         "value_type": "samples",
 *         "value": "316274"
 *       },
 *       {
 *         "value_type": "min_micro",
 *         "value": "162"
 *       },
 *       {
 *         "value_type": "max_micro",
 *         "value": "394014"
 *       },
 *       {
 *         "value_type": "signal",
 *         "value": "-59 dBm"
 *       }
 *     ]
 *   }
 *
 * Example out JSON:
 * [
 *   {"sensor_id": "sensorID", "value":"value" },
 *   ...
 * ]
 */

const matchings = {
  sds_p1: ['pm10', 'p10', 'p1'],
  sds_p2: ['pm2.5', 'pm25', 'p2.5', 'p25', 'p2'],
  temperature: ['temperatur'],
  humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit']
};

const findSensorId = function findSensorId (sensors, value_type) {
  const vt = value_type.toLowerCase();
  if (matchings[vt]) {
    let sensorId;

    for (const sensor of sensors) {
      const title = sensor.title.toLowerCase();
      if (title === vt || matchings[vt].includes(title)) {
        sensorId = sensor._id.toString();
        break;
      }
    }

    return sensorId;
  }
};

const transformLuftdatenJson = function transformLuftdatenJson (json, sensors) {
  const outArray = [];

  for (const sdv of json.sensordatavalues) {
    const sensor_id = findSensorId(sensors, sdv.value_type);
    if (sensor_id) {
      outArray.push({ sensor_id, value: sdv.value });
    }
  }

  return outArray;
};


module.exports = {
  decodeMessage: function (message, options) {
    if (!options || !options.sensors) {
      console.log('luftdaten handler needs sensors');

      return Promise.reject('luftdaten handler needs sensors');
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
          console.log(err);

          return Promise.reject(err);
        }
      }

      if (typeof json !== 'undefined') {
        if (!json.sensordatavalues) {
          return Promise.reject(new Error('Invalid luftdaten json. Missing `sensordatavalues`'));
        }

        return transformAndValidateArray(transformLuftdatenJson(json, options.sensors));
      }
    }

    return Promise.reject(new Error('Cannot decode empty message (luftdaten decoder)'));
  }
};

