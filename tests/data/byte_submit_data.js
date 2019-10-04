'use strict';

const moment = require('moment');

module.exports = function (sensors, withTimestamps) {
  const len = (withTimestamps ? 20 : 16);
  const buffer = Buffer.allocUnsafe(sensors.length * len);

  for (const [i, sensor] of sensors.entries()) {

    buffer.write(sensor._id, i * len, 12, 'hex');
    buffer.writeFloatLE(i, (i * len) + 12);
    if (withTimestamps) {
      buffer
        .writeUInt32LE(
          moment
            .utc()
            .subtract(i, 'minute')
            .unix(), (i * len) + 12 + 4
        );
    }
  }

  return buffer;
};
