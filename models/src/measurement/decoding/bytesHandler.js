'use strict';

const { transformAndValidateMeasurements } = require('./validators'),
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
  // moment stringifies dates created from unixtime as something like
  // 'Mon Jul 24 2017 19:22:15 GMT+0000', so we need to prevent that.
  return moment.utc(buffer.readUInt32LE(offset) * 1000).toISOString();
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
      let bytes;
      try {
        bytes = messageToBytes(message, DATA_LENGTH_NO_TIMESTAMP);
      } catch (err) {
        return Promise.reject(err);
      }

      const measurements = [];

      for (let first = 0, len = bytes.length; first < len; first = first + DATA_LENGTH_NO_TIMESTAMP) {
        measurements.push(extractMeasurement(bytes, first));
      }

      return transformAndValidateMeasurements(measurements);
    }
  },
  bytesTimestampHandler: {
    decodeMessage (message) {
      const bytes = messageToBytes(message, DATA_LENGTH_WITH_TIMESTAMP);

      const measurements = [];

      for (let first = 0, len = bytes.length; first < len; first = first + DATA_LENGTH_WITH_TIMESTAMP) {
        measurements.push(extractMeasurement(bytes, first, true));
      }

      return transformAndValidateMeasurements(measurements);
    }
  }
};
