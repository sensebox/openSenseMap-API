'use strict';

const config = require('../config'),
  moment = require('moment'),
  request = require('request');


let Honeybadger = {
  notify () {},
  resetContext () {}
};

/* eslint-disable global-require */
if (config.honeybadger_apikey && config.honeybadger_apikey !== '') {
  Honeybadger = require('honeybadger').configure({
    apiKey: config.honeybadger_apikey
  });
}
/* eslint-enable global-require */

/**
 * define for Datetype parameters
 * @apiDefine ISO8601Date A ISO8601 formatted timestamp. Will be parsed by MomentJS with enabled strict mode
 */

// time parsing function used throughout the api
const parseTimestamp = function parseTimestamp (timestamp) {
  if (timestamp instanceof Date) {
    return moment.utc(timestamp);
  }

  return moment.utc(timestamp, moment.ISO_8601, true);
};

// checks if the timestamp is not too far in the future
// returns true or false
const timeIsValid = function timeIsValid (timestamp) {
  const nowPlusOneMinute = moment.utc().add(1, 'minutes');
  if (!moment.isMoment(timestamp)) {
    timestamp = parseTimestamp(timestamp);
  }

  return timestamp.isValid() && nowPlusOneMinute.isAfter(timestamp);
};

// returns now as UTC JavaScript Date Object
const utcNowDate = function utcNowDate () {
  return moment.utc().toDate();
};

const postToSlack = function postToSlack (text) {
  if (config.slack_url) {
    request.post({ url: config.slack_url, json: { text: text } });
  }
};

const softwareRevision = (function () {
  try {
    /* eslint-disable global-require */
    const parts = require('fs')
      .readFileSync(`${__dirname}/../revision`)
      .toString()
      .split(' ');
    /* eslint-enable global-require */
    parts[1] = new Date(parseInt(parts[1], 10) * 1000).toISOString();

    return `${parts[0]} ${parts[1]} ${parts[2]}`;
  } catch (err) {
    return 'unkown revision';
  }
})();

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

module.exports = {
  config,
  Honeybadger,
  parseTimestamp,
  isJSONParseable,
  isNonEmptyString,
  timeIsValid,
  utcNowDate,
  postToSlack,
  softwareRevision
};
