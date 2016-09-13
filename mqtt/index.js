'use strict';

let mqtt = require('mqtt'),
  handlers = require('./handlers');

// use this object as simple key/value store for connecting/disconnecting
let mqttConnections = {};

let connect = function (box) {
  // disconnect any running connections before reconnecting..
  disconnect(box);
  if (box.mqtt) {
    let handler = handlers[box.mqtt.messageFormat],
      decodeOptions;

    try {
      decodeOptions = JSON.parse(box.mqtt.decodeOptions);
    } catch (e) {
      console.log('mqtt decode options of box', box._id, 'not parseable');
    }

    if (box.mqtt.url && box.mqtt.topic && handler) {
      mqttConnections[box._id] = mqtt.connect(box.mqtt.url);
      let client = mqttConnections[box._id];
      client.reconnecting = true;

      client.on('connect', function () {
        client.subscribe(box.mqtt.topic);
      });

      client.on('message', function (topic, message) {
        let decoded = handler.decodeMessage(message, decodeOptions);
        box.saveMeasurements(decoded);
      });
    }
  }
};

let disconnect = function (box) {
  if (mqttConnections[box._id]) {
    mqttConnections[box._id].end(true);
    mqttConnections[box._id] = undefined;
  }
};

module.exports = {
  connect: connect,
  disconnect: disconnect
};
