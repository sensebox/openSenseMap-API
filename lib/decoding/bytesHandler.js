'use strict';

const transformAndValidateArray = require('./transformAndValidateArray'),
  moment = require('moment');

/* this decoder accepts byte encoded data
 * the first 12 bytes are the sensor id, followed by 4 bytes of a float
 * will fail if the number of bytes is not a multiple of 16
 */

const DATA_LENGTH_NO_TIMESTAMP = 16,
  DATA_LENGTH_WITH_TIMESTAMP = 20,
  ID_LENGTH = 12,
  VALUE_LENGTH = 4;

const extractMeasurement = function extractMeasurement (buffer, offset, expectTimestamp = false) {
  const measurement = {
    sensor_id: extractSensorID(buffer, offset, offset + ID_LENGTH),
    value: extractFloat(buffer, offset + ID_LENGTH)
  };
  if (expectTimestamp === true) {
    measurement.createdAt = extractTimestamp(buffer, offset + ID_LENGTH + VALUE_LENGTH);
  }

  return measurement;
};

const extractSensorID = function extractSensorID (buffer, from, to) {
  return buffer.toString('hex', from, to);
};

const extractFloat = function extractFloat (buffer, offset) {
  return buffer.readFloatLE(offset).toFixed(1);
};

const extractTimestamp = function extractTimestamp (buffer, offset) {
  return moment.utc(buffer.readUInt32LE(offset) * 1000);
};

const messageToBytes = function messageToBytes (bytes, len) {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('Invalid data.');
  }

  if (bytes.length % len !== 0) {
    throw new Error(`Invalid count of bytes. Expects multiples of ${len} bytes.`);
  }

  return Buffer.from(bytes);
};

module.exports = {
  bytesHandler: {
    decodeMessage (message) {
      const bytes = messageToBytes(message, DATA_LENGTH_NO_TIMESTAMP);

      const measurements = [];

      for (let first = 0, len = bytes.length; first < len; first = first + DATA_LENGTH_NO_TIMESTAMP) {
        measurements.push(extractMeasurement(bytes, first));
      }

      return transformAndValidateArray(measurements);
    }
  },
  bytesTimestampHandler: {
    decodeMessage (message) {
      const bytes = messageToBytes(message, DATA_LENGTH_WITH_TIMESTAMP);

      const measurements = [];

      for (let first = 0, len = bytes.length; first < len; first = first + DATA_LENGTH_WITH_TIMESTAMP) {
        measurements.push(extractMeasurement(bytes, first, true));
      }

      return transformAndValidateArray(measurements);
    }
  }
};
