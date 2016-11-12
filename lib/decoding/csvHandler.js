'use strict';

const transformAndValidateArray = require('./transformAndValidateArray');

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
      let measurementsArray = [];
      for (const line of splittedLines) {
        // remove empty parts
        while (line[0] === '') {
          line.shift();
        }

        if (line.length !== 0) {
          console.log(line);
          if (line.length === 2 || line.length === 3) {
            const measurement = { sensor_id: line.shift() };
            measurement.value = line.shift();
            measurement.createdAt = line.shift();
            measurementsArray.push(measurement);
          } else {
            throw new Error(`illegal line '${line.join(',')}'`);
          }
        }
      }

      measurementsArray = transformAndValidateArray(measurementsArray);

      return measurementsArray;
    }
  }
};
