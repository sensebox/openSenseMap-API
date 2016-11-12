'use strict';

const moment = require('moment');

const no_timestamps = function (sensors) {
  const str = sensors.map(function (sensor, index) {
    return `${sensor._id},${index}`;
  }).join('\n');

  return str;
};

const with_timestamps = function (sensors) {
  const str = sensors.map(function (sensor, index) {
    return `${sensor._id},${index},${moment.utc().subtract(index, 'minutes').toISOString()}`;
  }).join('\n');

  return str;
};

const with_timestamps_future = function (sensors) {
  const str = sensors.map(function (sensor, index) {
    return `${sensor._id},${index},${moment.utc().add(index, 'minutes').toISOString()}`;
  }).join('\n');

  return str;
};

const with_too_many = function (sensors) {
  const str = sensors.map(function (sensor, index) {
    return `${sensor._id},${index},${moment.utc().add(index, 'minutes').toISOString()}`;
  }).join('\n');

  return str;
};

module.exports = {
  no_timestamps,
  with_timestamps,
  with_timestamps_future,
  with_too_many
};
