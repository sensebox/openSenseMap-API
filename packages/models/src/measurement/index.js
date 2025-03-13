'use strict';

const { desc } = require('drizzle-orm');
const { measurementTable } = require('../../schema/schema');
const { db } = require('../drizzle');
const ModelError = require('../modelError');
const decodeHandlers = require('./decoding');

const hasDecoder = function hasDecoder (contentType) {
  if (!decodeHandlers[contentType]) {
    return false;
  }

  return true;
};

const decodeMeasurements = function decodeMeasurements (measurements, { contentType = 'json', sensors } = {}) {
  return decodeHandlers[contentType].decodeMessage(measurements, { sensors })
    .catch(function (err) {
      throw new ModelError(err.message, { type: 'UnprocessableEntityError' });
    });
};

const insertMeasurement = async function insertMeasurement (measurement) {
  return db.insert(measurementTable).values({
    sensorId: measurement.sensor_id,
    value: measurement.value,
    time: measurement.createAt
  });
};

const getMeasurements = async function getMeasurements (sensorId, limit = 1) {
  const measurements = await db.query.measurementTable.findMany({
    where: (measurement, { eq }) => eq(measurement.sensorId, sensorId),
    orderBy: desc(measurementTable.time),
    limit: limit,
  });

  return measurements;
};

const insertMeasurements = async function insertMeasurements (measurements) {
  const transformedMeasurements = measurements.map(({ sensor_id, ...rest }) => ({
    sensorId: sensor_id, // Rename sensor_id to sensorId
    ...rest, // Keep the rest of the object properties unchanged
  }));
  return db.insert(measurementTable).values(transformedMeasurements);
};

module.exports = {
  decodeMeasurements,
  hasDecoder,
  getMeasurements,
  insertMeasurement,
  insertMeasurements
};
