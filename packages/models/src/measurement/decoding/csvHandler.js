'use strict';

const { transformAndValidateMeasurements } = require('./validators');

const csvLineHandler = function (line) {
  return line.split(',').map(p => p.trim());
};

module.exports = {
  decodeMessage: function (message) {
    // if the message isn't a string.. call toString()
    if (message && typeof message !== 'string') {
      message = message.toString();
    }

    if (message) {
      const lines = message.split(/\r?\n/);
      const splittedLines = lines.map(csvLineHandler);

      // transform the splitted lines to an array containing measurements
      const measurementsArray = [];
      for (const line of splittedLines) {
        // remove empty parts
        while (line[0] === '') {
          line.shift();
        }

        if (line.length !== 0) {
          if (line.length >= 2 && line.length <= 6) {
            const measurement = { sensor_id: line.shift() };
            measurement.value = line.shift();
            measurement.createdAt = line.shift();
            if (line.length >= 2) {
              measurement.location = {};
              measurement.location.lng = parseFloat(line.shift());
              measurement.location.lat = parseFloat(line.shift());
              measurement.location.height = parseFloat(line.shift());
            }
            measurementsArray.push(measurement);
          } else {
            return Promise.reject(new Error(`illegal line '${line.join(',')}'`));
          }
        }
      }

      return transformAndValidateMeasurements(measurementsArray);
    }

    return Promise.reject(new Error('Cannot decode empty message (csv decoder)'));
  }
};
