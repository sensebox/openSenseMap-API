'use strict';

const { sql } = require('drizzle-orm');
const { db } = require('../drizzle');

// LATERAL JOIN to get latest measurement for sensors belonging to a specific device, including device name
const getSensorsWithLastMeasurement = async function getSensorsWithLastMeasurement (deviceId) {
  const { rows } = await db.execute(
    sql`SELECT s.title, s.unit, s.sensor_type, json_object(ARRAY['value', 'createdAt'], ARRAY[CAST(measure.value AS TEXT),CAST(measure.time AS TEXT)]) AS "lastMeasurement"
      FROM sensor s
      JOIN device d ON s.device_id = d.id
      LEFT JOIN LATERAL (
        SELECT * FROM measurement m
        WHERE m.sensor_id = s.id
        ORDER BY m.time DESC
        LIMIT 1
      ) AS measure ON true
      WHERE s.device_id = ${deviceId};`,
  );

  return rows;
};

module.exports = {
  getSensorsWithLastMeasurement
};
