'use strict';

const { sql, and, count, gt, lt } = require('drizzle-orm');
const { db } = require('../drizzle');

const rowCount = async function rowCount (table) {
  const { rows } = await db.execute(sql`SELECT * FROM approximate_row_count(${table});`);

  const [count] = rows;

  return Number(count.approximate_row_count);
};

const rowCountTimeBucket = async function rowCountTimeBucket (table, timeColumn, interval) {
  const result = await db.select({ count: count() }).from(table)
    .where(and(gt(table[timeColumn], new Date(Date.now() - interval), lt(table[timeColumn], new Date()))));

  const [rowCount] = result;

  return Number(rowCount.count);
};

module.exports = {
  rowCount,
  rowCountTimeBucket
};
