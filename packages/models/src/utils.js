'use strict';

const moment = require('moment');

// time parsing function used throughout the api
const parseTimestamp = function parseTimestamp (timestamp) {
  if (timestamp instanceof Date || timestamp instanceof moment) {
    return moment.utc(timestamp);
  }

  // is not moment or date, should be safe to call .toString here
  const [dateParts, timeParts] = timestamp.toString().toUpperCase()
    .split('T');

  if (!timeParts) {
    return moment.invalid();
  }

  const [year, month, day, ...restDate] = dateParts.split('-');
  if (restDate.length !== 0
    || !month
    || !day
    || month.length !== 2
    || day.length !== 2
    || year.length !== 4) {
    return moment.invalid();
  }

  /* eslint-disable prefer-const */
  let [hour, minute, lastTimePart] = timeParts.split(':');
  /* eslint-enable prefer-const */
  if (!minute || !lastTimePart || !lastTimePart.endsWith('Z')) {
    return moment.invalid();
  }
  lastTimePart = lastTimePart.slice(0, -1);


  /* eslint-disable prefer-const */
  let [second, millisecond = '0'] = lastTimePart.split('.');
  /* eslint-enable prefer-const */

  if ([hour, minute, second].some(tp => tp.length !== 2)) {
    return moment.invalid();
  }

  // values after the dot are interpreted as nanoseconds
  // if there are more than 3 digits
  if (millisecond.length > 3) {
    millisecond = parseInt(millisecond, 10) / 1000000;
  }

  return moment.utc([year, month - 1, day, hour, minute, second, millisecond], undefined, true, true);
};

const parseAndValidateTimestamp = function parseAndValidateTimestamp (
  timestamp
) {
  const input = timestamp;
  if (!moment.isMoment(timestamp)) {
    timestamp = parseTimestamp(timestamp);
  }

  if (!timestamp.isValid()) {
    throw new Error(`Invalid timestamp '${input}'.`);
  }

  return timestamp;
};

// returns now as UTC moment
const utcNow = function utcNow () {
  return moment.utc();
};

const isJSONParseable = function isJSONParseable (value) {
  if (value !== '') {
    try {
      JSON.parse(value);

      return true;
    } catch (err) {
      return false;
    }
  }

  return true;
};

const isNonEmptyString = function isNonEmptyString (val) {
  return !(typeof val === 'undefined' || val === '');
};

// https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
const isNumeric = function isNumeric (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

module.exports = {
  parseTimestamp,
  isJSONParseable,
  isNonEmptyString,
  isNumeric,
  parseAndValidateTimestamp,
  utcNow
};
