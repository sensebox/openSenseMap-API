'use strict';

let csvLineHandler = function (line) {
  return line.split(',').map(p => p.trim());
};

module.exports = {
  decodeMessage: function (message, options) {
    if (message) {
      let lines = message.split(/\r?\n/);
      let splittedLines = lines.map(csvLineHandler);

      // transform the splitted lines to an object..
      let measurementsObj;
      for (var i = splittedLines.length - 1; i >= 0; i--) {
        // check if there are enough parts
        // 2 parts = sensorId,value
        // 3 parts = sensorId,value,timestamp
        if (splittedLines[i].length === 2 || splittedLines[i].length === 3) {
          if (splittedLines[i][0].trim() !== '') {
            // init
            if (!measurementsObj) {
              measurementsObj = {};
            }
            let sensorId = splittedLines[i].shift();
            measurementsObj[sensorId] = splittedLines[i];
          }
        }
      }
      return measurementsObj;
    }
  }
};
