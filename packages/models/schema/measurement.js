'use strict';

const { pgTable, text, timestamp, doublePrecision, unique, pgMaterializedView, integer } = require('drizzle-orm/pg-core');

/**
 * Table definition
 */
const measurement = pgTable('measurement', {
  sensorId: text('sensor_id').notNull(),
  time: timestamp('time', { precision: 3, withTimezone: true }).defaultNow()
    .notNull(),
  value: doublePrecision('value')
}, (t) => ({
  unq: unique().on(t.sensorId, t.time)
}));

/**
 * Views
 */
const measurement10minView = pgMaterializedView('measurement_10min', {
  sensorId: text('sensor_id'),
  time: timestamp('time', { precision: 3, withTimezone: true }),
  value: doublePrecision('avg_value'),
  total_values: integer('total_values'),
  min_value: doublePrecision('min_value'),
  max_value: doublePrecision('max_value')
}).existing();

const measurements1hourView = pgMaterializedView('measurement_1hour', {
  sensorId: text('sensor_id'),
  time: timestamp('time', { precision: 3, withTimezone: true }),
  value: doublePrecision('avg_value'),
  total_values: integer('total_values'),
  min_value: doublePrecision('min_value'),
  max_value: doublePrecision('max_value')
}).existing();

const measurements1dayView = pgMaterializedView('measurement_1day', {
  sensorId: text('sensor_id'),
  time: timestamp('time', { precision: 3, withTimezone: true }),
  value: doublePrecision('avg_value'),
  total_values: integer('total_values'),
  min_value: doublePrecision('min_value'),
  max_value: doublePrecision('max_value')
}).existing();

const measurements1monthView = pgMaterializedView('measurement_1month', {
  sensorId: text('sensor_id'),
  time: timestamp('time', { precision: 3, withTimezone: true }),
  value: doublePrecision('avg_value'),
  total_values: integer('total_values'),
  min_value: doublePrecision('min_value'),
  max_value: doublePrecision('max_value')
}).existing();

const measurements1yearView = pgMaterializedView('measurement_1year', {
  sensorId: text('sensor_id'),
  time: timestamp('time', { precision: 3, withTimezone: true }),
  value: doublePrecision('avg_value'),
  total_values: integer('total_values'),
  min_value: doublePrecision('min_value'),
  max_value: doublePrecision('max_value')
}).existing();


module.exports = {
  table: measurement,
  views: {
    measurement10minView,
    measurements1hourView,
    measurements1dayView,
    measurements1monthView,
    measurements1yearView
  }
};
