'use strict';

const fs = require('fs'),
  cfg = require('../utils').config;

const appendSensors = function appendSensors (output, box) {
  let customSensorindex = 1;
  for (let i = box.sensors.length - 1; i >= 0; i--) {
    const sensor = box.sensors[i];
    if (!box._isCustom && sensor.title === 'Temperatur') {
      fs.appendFileSync(output, `#define TEMPSENSOR_ID "${sensor._id}"\n`);
    } else if (!box._isCustom && sensor.title === 'rel. Luftfeuchte') {
      fs.appendFileSync(output, `#define HUMISENSOR_ID "${sensor._id}"\n`);
    } else if (!box._isCustom && sensor.title === 'Luftdruck') {
      fs.appendFileSync(output, `#define PRESSURESENSOR_ID "${sensor._id}"\n`);
    } else if (!box._isCustom && sensor.title === 'Lautstärke') {
      fs.appendFileSync(output, `#define NOISESENSOR_ID "${sensor._id}"\n`);
    } else if (!box._isCustom && sensor.title === 'Helligkeit') {
      fs.appendFileSync(output, `#define LIGHTSENSOR_ID "${sensor._id}"\n`);
    } else if (!box._isCustom && sensor.title === 'Beleuchtungsstärke') {
      fs.appendFileSync(output, `#define LUXSENSOR_ID "${sensor._id}"\n`);
    } else if (!box._isCustom && sensor.title === 'UV-Intensität') {
      fs.appendFileSync(output, `#define UVSENSOR_ID "${sensor._id}"\n`);
    } else {
      fs.appendFileSync(output, `#define SENSOR${customSensorindex}_ID "${sensor._id}" \/\/ ${sensor.title}\n`);
      customSensorindex++;
    }
  }
};

module.exports = function processSketchGeneric (templateLines, output, box) {
  for (const line of templateLines) {
    if (line.indexOf('//senseBox ID') !== -1) {
      fs.appendFileSync(output, `${line.toString()}\n`);
      fs.appendFileSync(output, `#define SENSEBOX_ID "${box._id}"\n`);
    } else if (line.indexOf('//Sensor IDs') !== -1) {
      fs.appendFileSync(output, `${line.toString()}\n`);
      appendSensors(output, box);
    } else if (line.indexOf('@@OSEM_POST_DOMAIN@@') !== -1) {
      const newLine = line.toString().replace('@@OSEM_POST_DOMAIN@@', cfg.measurements_post_domain);
      fs.appendFileSync(output, `${newLine}\n`);
    } else {
      fs.appendFileSync(output, `${line.toString()}\n`);
    }
  }
};
