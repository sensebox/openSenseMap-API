'use strict';

const { sql } = require('drizzle-orm');
const { db } = require('../drizzle');

const count = async function count (table) {
  const { rows } = await db.execute(sql`SELECT * FROM approximate_row_count(${table});`);

  const [count] = rows;

  return count.approximate_row_count;
};

module.exports = {
  count
};
