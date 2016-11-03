'use strict';
let fs = require('fs'),
  utils = require('../utils'),
  Honeybadger = utils.Honeybadger,
  cfg = utils.config;

module.exports = {
  // generate Arduino sketch
  generateSketch (box) {
    let output = cfg.targetFolder + '' + box._id + '.ino';
    // remove old script it it exists
    try {
      if (fs.statSync(output)) {
        fs.unlinkSync(output);
        console.log('deleted old sketch. (' + output + ') bye bye!');
      }
    } catch (e) {
      // don't notify honeybadger on ENOENT. The file isn't there if the script is first generated..
      if (e.code !== 'ENOENT') {
        Honeybadger.notify(e);
      }
    }

    let isCustom = false,
      filename;
    switch (box.model) {
    case 'homeEthernet':
      filename = 'files/template_home/template_home.ino';
      break;
    case 'basicEthernet':
      filename = 'files/template_basic/template_basic.ino';
      break;
    case 'homeWifi':
      filename = 'files/template_home_wifi/template_home_wifi.ino';
      break;
    default:
      isCustom = true;
      filename = 'files/template_custom_setup/template_custom_setup.ino';
      break;
    }

    fs.readFileSync(filename)
      .toString()
      .split('\n')
      .forEach(function (line) {
        if (line.indexOf('//senseBox ID') !== -1) {
          fs.appendFileSync(output, line.toString() + '\n');
          fs.appendFileSync(output, '#define SENSEBOX_ID "' + box._id + '"\n');
        } else if (line.indexOf('//Sensor IDs') !== -1) {
          fs.appendFileSync(output, line.toString() + '\n');
          let customSensorindex = 1;
          for (let i = box.sensors.length - 1; i >= 0; i--) {
            let sensor = box.sensors[i];
            if (!isCustom && sensor.title === 'Temperatur') {
              fs.appendFileSync(output, '#define TEMPSENSOR_ID "' + sensor._id + '"\n');
            } else if (!isCustom && sensor.title === 'rel. Luftfeuchte') {
              fs.appendFileSync(output, '#define HUMISENSOR_ID "' + sensor._id + '"\n');
            } else if (!isCustom && sensor.title === 'Luftdruck') {
              fs.appendFileSync(output, '#define PRESSURESENSOR_ID "' + sensor._id + '"\n');
            } else if (!isCustom && sensor.title === 'Lautstärke') {
              fs.appendFileSync(output, '#define NOISESENSOR_ID "' + sensor._id + '"\n');
            } else if (!isCustom && sensor.title === 'Helligkeit') {
              fs.appendFileSync(output, '#define LIGHTSENSOR_ID "' + sensor._id + '"\n');
            } else if (!isCustom && sensor.title === 'Beleuchtungsstärke') {
              fs.appendFileSync(output, '#define LUXSENSOR_ID "' + sensor._id + '"\n');
            } else if (!isCustom && sensor.title === 'UV-Intensität') {
              fs.appendFileSync(output, '#define UVSENSOR_ID "' + sensor._id + '"\n');
            } else {
              fs.appendFileSync(output, '#define SENSOR' + customSensorindex + '_ID "' + sensor._id + '" \/\/ ' + sensor.title + '\n');
              customSensorindex++;
            }
          }
        } else if (line.indexOf('@@OSEM_POST_DOMAIN@@') !== -1) {
          let newLine = line.toString().replace('@@OSEM_POST_DOMAIN@@', cfg.measurements_post_domain);
          fs.appendFileSync(output, newLine + '\n');
        } else {
          fs.appendFileSync(output, line.toString() + '\n');
        }
      });
  }
};
