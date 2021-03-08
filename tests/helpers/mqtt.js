'use strict';

const mqtt = require('mqtt');

const publishMqttMessage = function publishMqttMessage (server, topic, message) {
  const client = mqtt.connect(server);

  return new Promise(function (resolve, reject) {
    client.on('connect', function () {
      client.publish(topic, message, {}, function (err) {
        if (err) {
          client.end();
          reject(err);
          return
        }

        client.end();
        resolve();
      });
    });

  });
};

module.exports = publishMqttMessage;
