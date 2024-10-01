'use strict';

const { measurementTable } = require('../../schema/schema');
const { db } = require('../drizzle');

const insertMeasurement = async function insertMeasurement (measurement) {
  return db.insert(measurementTable).values({
    sensorId: measurement.sensor_id,
    value: measurement.value,
    time: measurement.createAt
  });
};

module.exports = {
  insertMeasurement
};
