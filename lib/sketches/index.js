'use strict';

const fs = require('fs'),
  utils = require('../utils'),
  Honeybadger = utils.Honeybadger,
  cfg = utils.config,
  processSketchGeneric = require('./processGeneric'),
  processSketchWifi = require('./processWifi');

module.exports = {
  // generate Arduino sketch
  generateSketch (box) {
    const output = `${cfg.targetFolder}${box._id}.ino`;
    // remove old script it it exists
    try {
      if (fs.statSync(output)) {
        fs.unlinkSync(output);
        console.log(`deleted old sketch. (${output}) bye bye!`);
      }
    } catch (e) {
      // don't notify honeybadger on ENOENT. The file isn't there if the script is first generated..
      if (e.code !== 'ENOENT') {
        Honeybadger.notify(e);
      }
    }

    let filename,
      sketchProcessor = processSketchGeneric;
    switch (box.model) {
    case 'homeEthernet':
      filename = 'files/template_home/template_home.ino';
      sketchProcessor = processSketchWifi;
      break;
    case 'basicEthernet':
      filename = 'files/template_basic/template_basic.ino';
      break;
    case 'homeWifi':
      filename = 'files/template_home_wifi/template_home_wifi.ino';
      sketchProcessor = processSketchWifi;
      break;
    default:
      box._isCustom = true;
      filename = 'files/template_custom_setup/template_custom_setup.ino';
      break;
    }

    sketchProcessor(
      fs.readFileSync(filename)
        .toString()
        .split('\n'),
      output,
      box
    );
  }
};
