'use strict';

const moment = require('moment');

// time parsing function used throughout the api
const parseTimestamp = function parseTimestamp (timestamp) {
  if (timestamp instanceof Date || timestamp instanceof moment) {
    return moment.utc(timestamp);
  }

  // is not moment or date, should be safe to call .toString here
  return moment.utc(timestamp.toString(), moment.ISO_8601, true);
};

const parseAndValidateTimestamp = function parseAndValidateTimestamp (timestamp) {
  if (!moment.isMoment(timestamp)) {
    timestamp = parseTimestamp(timestamp);
  }

  if (!timestamp.isValid()) {
    throw new Error(`Invalid timestamp '${timestamp.creationData().input}'.`);
  }

  const nowPlusOneMinute = moment.utc().add(1, 'minutes');
  if (nowPlusOneMinute.isBefore(timestamp)) {
    throw new Error(`Timestamp ${timestamp.toISOString()} is too far into the future.`);
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
