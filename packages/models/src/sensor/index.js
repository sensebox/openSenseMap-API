'use strict';

const { sql } = require('drizzle-orm');
const { db } = require('../drizzle');

// LATERAL JOIN to get latest measurement for sensors belonging to a specific device, including device name
const getSensorsWithLastMeasurement = async function getSensorsWithLastMeasurement (deviceId, count = 1) {
  const { rows } = await db.execute(
    sql`SELECT s.id, s.title, s.unit, s.sensor_type, json_object(ARRAY['value', 'createdAt'], ARRAY[CAST(measure.value AS TEXT),CAST(measure.time AS TEXT)]) AS "lastMeasurement"
      FROM sensor s
      JOIN device d ON s.device_id = d.id
      LEFT JOIN LATERAL (
        SELECT * FROM measurement m
        WHERE m.sensor_id = s.id
        ORDER BY m.time DESC
        LIMIT ${count}
      ) AS measure ON true
      WHERE s.device_id = ${deviceId};`,
  );

  return rows;
};

const getSensorsWithLastMeasurements =
  async function getSensorsWithLastMeasurements (deviceId, count = 1) {
    const { rows } = await db.execute(
      sql`SELECT s.id, s.title, s.unit, s.sensor_type, json_agg(json_build_object('value', measure.value, 'createdAt', measure.time)) AS "lastMeasurements"
      FROM sensor s
      JOIN device d ON s.device_id = d.id
      LEFT JOIN LATERAL (
        SELECT * FROM measurement m
        WHERE m.sensor_id = s.id
        ORDER BY m.time DESC
        LIMIT ${count}
      ) AS measure ON true
      WHERE s.device_id = ${deviceId}
      GROUP BY s.id;`
    );

    return rows;
  };

// LATERAL JOIN to get latest measurement for sensors belonging to a specific device, including device name
const getSensorWithLastMeasurement =
  async function getSensorWithLastMeasurement (deviceId, sensorId, count = 1) {
    const { rows } = await db.execute(
      sql`SELECT s.id, s.title, s.unit, s.sensor_type, json_object(ARRAY['value', 'createdAt'], ARRAY[CAST(measure.value AS TEXT),CAST(measure.time AS TEXT)]) AS "lastMeasurement"
      FROM sensor s
      JOIN device d ON s.device_id = d.id
      LEFT JOIN LATERAL (
        SELECT * FROM measurement m
        WHERE m.sensor_id = s.id
        ORDER BY m.time DESC
        LIMIT ${count}
      ) AS measure ON true
      WHERE s.device_id = ${deviceId} AND s.id=${sensorId};`
    );

    return rows;
  };

module.exports = {
  getSensorsWithLastMeasurement,
  getSensorsWithLastMeasurements,
  getSensorWithLastMeasurement
};
