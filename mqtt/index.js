'use strict';

let mqtt = require('mqtt'),
  handlers = require('./handlers'),
  connOptsParser = require('./connectionOptionsParser');

// use this object as simple key/value store for connecting/disconnecting
let mqttConnections = {};

let connect = function (box) {
  // disconnect any running connections before reconnecting..
  disconnect(box);
  if (box.mqtt && box.mqtt.url !== '') {
    let handler = handlers[box.mqtt.messageFormat],
      decodeOptions;

    try {
      decodeOptions = JSON.parse(box.mqtt.decodeOptions);
    } catch (e) {
      console.log('mqtt decode options of box', box._id, 'not parseable');
    }

    if (box.mqtt.url && box.mqtt.topic && handler) {
      // parse mqtt connection options
      let connectionOptions = connOptsParser.parse(box.mqtt.connectionOptions);

      mqttConnections[box._id] = mqtt.connect(box.mqtt.url, connectionOptions);
      let client = mqttConnections[box._id];
      client.reconnecting = true;

      client.on('error', function (err) {
        console.log('mqtt error:', err, 'box:', box._id);
      });

      client.on('close', function () {
        console.log('mqtt closed for box:', box._id);
      });

      client.on('connect', function () {
        console.log('connected mqtt for box', box._id);
        client.subscribe(box.mqtt.topic);
      });

      client.on('message', function (topic, message) {
        let msgStr = message.toString();
        let decoded = handler.decodeMessage(msgStr, decodeOptions);
        box.saveMeasurements(decoded)
          .then(function (result) {
            if (result.length !== 0) {
              console.log('received, decoded and saved mqtt message for box', box._id);
            }
          })
          .catch(function (err) {
            console.log('error saving mqtt message for box', box._id, 'error:', err, 'message:', msgStr);
          });
      });
    }
  }
};

let disconnect = function (box) {
  if (mqttConnections[box._id]) {
    mqttConnections[box._id].end(true);
    mqttConnections[box._id] = undefined;
    console.log('disconnected mqtt for box', box._id);
  }
};

module.exports = {
  connect: connect,
  disconnect: disconnect
};
