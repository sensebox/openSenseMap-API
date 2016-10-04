'use strict';

let cfg = require('../config'),
  moment = require('moment');

let Honeybadger = {
  notify: function () {}
};

if (cfg.honeybadger_apikey && cfg.honeybadger_apikey !== '') {
  Honeybadger = require('honeybadger').configure({
    apiKey: cfg.honeybadger_apikey
  });
}

// time parsing function used throughout the api
let parseTimestamp = function (timestamp) {
  if (timestamp instanceof Date) {
    return moment.utc(timestamp);
  } else {
    return moment.utc(timestamp, moment.ISO_8601, true);
  }
};

// http://stackoverflow.com/a/23453651
let sanitizeString = function (str) {
  str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, '');
  return str.trim();
};

// checks if the timestamp is not too far in the future
// returns true or false
let timeIsValid = function (timestamp) {
  let nowPlusOneMinute = moment.utc().add(1, 'minutes');
  if (!moment.isMoment(timestamp)) {
    timestamp = parseTimestamp(timestamp);
  }
  return timestamp.isValid() && nowPlusOneMinute.isAfter(timestamp);
};

// returns now as UTC JavaScript Date Object
let utcNowDate = function () {
  return moment.utc().toDate();
};

module.exports = {
  config: cfg,
  Honeybadger: Honeybadger,
  parseTimestamp: parseTimestamp,
  timeIsValid: timeIsValid,
  sanitizeString: sanitizeString,
  utcNowDate: utcNowDate
};
