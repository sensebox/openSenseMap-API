'use strict';

const { transformAndValidateMeasurements } = require('./validators');

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
 * Example in JSON PMS7003 with BME280
 *   { "software_version": "NRZ-2017-099",
 *     "sensordatavalues":[
 *       {"value_type":"PMS_P0","value":"1.00"},
 *       {"value_type":"PMS_P1","value":"2.00"},
 *       {"value_type":"PMS_P2","value":"2.00"},
 *       {"value_type":"BME280_temperature","value":"24.98"},
 *       {"value_type":"BME280_humidity","value":"39.60"},
 *       {"value_type":"BME280_pressure","value":"100520.25"},
 *       {"value_type":"samples","value":"580590"},
 *       {"value_type":"min_micro","value":"216"},
 *       {"value_type":"max_micro","value":"3503442"},
 *       {"value_type":"signal","value":"-38"}
 *     ]
 *   }
 *
 * Example out JSON:
 * [
 *   {"sensor_id": "sensorID", "value":"value" },
 *   ...
 * ]
 *
 */

const matchings = {
  p0: ['pm01', 'pm0', 'p1.0', 'p0'],
  p01: ['pm0.1', 'p0.1'],
  p03: ['pm0.3', 'pm03', 'p0.3', 'p03'],
  p05: ['pm0.5', 'pm05', 'p0.5', 'p05'],
  p1: ['pm10', 'p10', 'p1'],
  p2: ['pm2.5', 'pm25', 'p2.5', 'p25', 'p2'],
  p4: ['pm4', 'p4'],
  p5: ['pm5', 'p5'],
  n1: ['nc1.0', 'nc1', 'n1.0', 'n1'],
  n01: ['nc0.1', 'n0.1', 'nc01', 'n01'],
  n03: ['nc0.3', 'n0.3', 'nc03', 'n03'],
  n05: ['nc0.5', 'n0.5', 'nc05', 'n05'],
  n4: ['nc4.0', 'n4.0', 'nc4', 'n4'],
  n5: ['nc5', 'n5'],
  n10: ['nc10', 'n10'],
  n25: ['nc2.5', 'n2.5'],
  temperature: ['temperatur'],
  humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'luftfeuchte'],
  pressure: ['luftdruck', 'druck'],
  signal: ['stärke', 'signal'],
};

const findSensorId = function findSensorId (sensors, value_type) {
  // temperature, humidity and pressure values
  // are named either directly or with a prefix
  // separated by underscores. The last element
  // should be the the desired phenomenon
  let [vt_sensortype, vt_phenomenon] = value_type
    .toLowerCase()
    .split('_');

  // DHT11 and DHT22 sensors have no underscore prefix
  if (!vt_phenomenon && ['temperature', 'humidity'].includes(vt_sensortype)) {
    vt_phenomenon = vt_sensortype;
    vt_sensortype = 'dht';
  } else if (!vt_phenomenon && vt_sensortype === 'signal') {
    vt_phenomenon = vt_sensortype;
    vt_sensortype = 'wifi';
  }

  if (matchings[vt_phenomenon]) {
    let sensorId;

    for (const sensor of sensors) {
      const title = sensor.title.toLowerCase();
      const type = sensor.sensorType.toLowerCase();
      if (
        (title === vt_phenomenon || matchings[vt_phenomenon].includes(title) || matchings[vt_phenomenon].some(alias => title.includes(alias)))
        &&
        (type.startsWith(vt_sensortype))
      ) {
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
  decodeMessage: function (message, { sensors } = {}) {
    if (!sensors) {
      return Promise.reject(new Error('luftdaten handler needs sensors'));
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

      if (!json.sensordatavalues) {
        return Promise.reject(new Error('Invalid luftdaten json. Missing `sensordatavalues`'));
      }

      const transformedMeasurements = transformLuftdatenJson(json, sensors);
      if (transformedMeasurements.length === 0) {
        return Promise.reject(new Error('No applicable values found'));
      }

      return transformAndValidateMeasurements(transformedMeasurements);
    }

    return Promise.reject(new Error('Cannot decode empty message (luftdaten decoder)'));
  }
};
