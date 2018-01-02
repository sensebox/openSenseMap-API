'use strict';

const moment = require('moment');

const parseISO8601 = function parseISO8601 (isoString) {
  return moment.utc(isoString, moment.ISO_8601, true);
};

module.exports = parseISO8601;
