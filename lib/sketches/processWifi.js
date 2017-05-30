'use strict';

const fs = require('fs'),
  cfg = require('../utils').config;

const substitutions = {
  'ctSensors' (box) {
    return `\/\/ Number of sensors\nstatic const uint8_t NUM_SENSORS = ${box.sensors.length};\n`;
  },
  'postDomain' () {
    return `const char *server = "${cfg.measurements_post_domain}";\n`;
  },
  'IDs' (box) {
    // sensors should follow this order strictly
    // when using the standard senseBox:home wifi setup
    // 0 Temperature
    // 1 Humidity
    // 2 Pressure
    // 3 Lux
    // 4 UV
    // the rest


    const homeSensors = [],
      otherSensors = [];
    for (const sensor of box.sensors) {
      switch (sensor.title) {
      case 'Temperatur':
        homeSensors[0] = `\/\/ ${sensor.title}\n{ ${idToHex(sensor._id.toString())} }`;
        break;
      case 'rel. Luftfeuchte':
        homeSensors[1] = `\/\/ ${sensor.title}\n{ ${idToHex(sensor._id.toString())} }`;
        break;
      case 'Luftdruck':
        homeSensors[2] = `\/\/ ${sensor.title}\n{ ${idToHex(sensor._id.toString())} }`;
        break;
      case 'Beleuchtungsstärke':
        homeSensors[3] = `\/\/ ${sensor.title}\n{ ${idToHex(sensor._id.toString())} }`;
        break;
      case 'UV-Intensität':
        homeSensors[4] = `\/\/ ${sensor.title}\n{ ${idToHex(sensor._id.toString())} }`;
        break;
      case 'PM10':
        homeSensors[5] = `\/\/ ${sensor.title}\n{ ${idToHex(sensor._id.toString())} }`;
        break;
      case 'PM2.5':
        homeSensors[6] = `\/\/ ${sensor.title}\n{ ${idToHex(sensor._id.toString())} }`;
        break;

      default:
        otherSensors.push(`\/\/ ${sensor.title}\n{ ${idToHex(sensor._id.toString())} }`);
        break;
      }
    }
    const allSensors = homeSensors.concat(otherSensors);

    return `\/\/ senseBox ID and sensor IDs
const uint8_t SENSEBOX_ID[12] = {${idToHex(box._id.toString())}};

\/\/ Do not change order of sensor IDs
const sensor sensors[NUM_SENSORS] = {
${allSensors.join(',\n')}
};
`;
  }
};

const idToHex = function idToHex (idStr) {
  return idStr.replace(/(..)/g, ', 0x$1').substr(2);
};


const createSubstitution = function createSubstitution (line, box) {
  const substitutionKey = line.split(' ')[2];
  if (substitutions[substitutionKey]) {
    return substitutions[substitutionKey](box);
  }

  return '\n';
};

module.exports = function processSketchWifi (templateLines, outputFilename, box) {
  for (const line of templateLines) {
    if (line.startsWith('@-- tmpl')) {
      fs.appendFileSync(outputFilename, createSubstitution(line, box));
    } else {
      fs.appendFileSync(outputFilename, `${line.toString()}\n`);
    }
  }
};
