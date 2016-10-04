'use strict';

let transformAndValidateArray = require('./transformAndValidateArray');

let csvLineHandler = function (line) {
  return line.split(',').map(p => p.trim());
};

module.exports = {
  decodeMessage: function (message) {
    // if the message isn't a string.. call toString()
    if (message && typeof message !== 'string') {
      message = message.toString();
    }

    if (message) {
      let lines = message.split(/\r?\n/);
      let splittedLines = lines.map(csvLineHandler);

      // transform the splitted lines to an array containing measurements
      let measurementsArray = [];
      for (let line of splittedLines) {
        // remove empty parts
        while (line[0] === '') {
          line.shift();
        }

        if (line.length !== 0) {
          console.log(line);
          if (line.length === 2 || line.length === 3) {
            let measurement = { sensor_id: line.shift() };
            measurement.value = line.shift();
            measurement.createdAt = line.shift();
            measurementsArray.push(measurement);
          } else {
            throw new Error('illegal line \'' + line.join(',') + '\'');
          }
        }
      }

      measurementsArray = transformAndValidateArray(measurementsArray);

      return measurementsArray;
    }
  }
};
