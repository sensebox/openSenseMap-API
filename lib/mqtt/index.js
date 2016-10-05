'use strict';

let mqtt = require('mqtt'),
  decodeHandlers = require('../decoding'),
  connOptsParser = require('./connectionOptionsParser');

const RETRY_AFTER_MINUTES = 10;

// use this object as simple key/value store for connecting/disconnecting
let mqttConnections = {};

let _retryAfter = function (box, afterMinutes) {
  let theBox = box;
  setTimeout(function () {
    connect(theBox);
  }, afterMinutes * 60000);
};

let _connect = function (box, maxRetries) {
  // parse mqtt connection options
  let connectionOptions = connOptsParser.parse(box.connectionOptions);
  let errRetries = maxRetries,
    closeRetries = maxRetries;

  let client = mqtt.connect(box.mqtt.url, connectionOptions);
  client.reconnecting = true;

  return new Promise(function (resolve, reject) {
    client.on('error', function (err) {
      errRetries = errRetries - 1;
      if (errRetries === 0) {
        client.reconnecting = false;
        client.end(true);
        errRetries = maxRetries;
        closeRetries = maxRetries;

        // retry after..
        _retryAfter(box, RETRY_AFTER_MINUTES);
        return reject('connection closed after 5 retries because of ' + err + '. Retry after ' + RETRY_AFTER_MINUTES + ' minutes');
      }
    });

    client.on('close', function () {
      closeRetries = closeRetries - 1;
      if (closeRetries === 0) {
        client.reconnecting = false;
        client.end(true);

        // retry after..
        _retryAfter(box, RETRY_AFTER_MINUTES);
        return reject('connection closed after 5 retries. Retry after ' + RETRY_AFTER_MINUTES + ' minutes');
      }
    });

    client.on('connect', function () {
      console.log('connected mqtt for box', box._id);
      client.subscribe(box.mqtt.topic);
      mqttConnections[box._id] = client;
      return resolve(client);
    });
  });
};

let connect = function (box) {
  // disconnect any running connections before reconnecting..
  disconnect(box);
  if (box.mqtt && box.mqtt.url !== '') {
    let handler = decodeHandlers[box.mqtt.messageFormat];

    if (box.mqtt.url && box.mqtt.topic && handler) {
      _connect(box, 5)
        .then(function (client) {
          let decodeOptions;
          try {
            decodeOptions = JSON.parse(box.mqtt.decodeOptions);
          } catch (e) {
            console.log('mqtt decode options of box', box._id, 'not parseable');
          }

          client.on('close', function () {
            console.log('mqtt closed for box:', box._id);
          });

          client.on('message', function (topic, message) {
            let msgStr = message.toString();
            let decoded = handler.decodeMessage(msgStr, decodeOptions);
            box.saveMeasurementsArray(decoded)
              .then(function (result) {
                if (result.length !== 0) {
                  console.log('received, decoded and saved mqtt message for box', box._id);
                }
              })
              .catch(function (err) {
                console.log('error saving mqtt message for box', box._id, 'error:', err, 'message:', msgStr);
              });
          });
        })
        .catch(function (err) {
          console.log('mqtt error for box', box._id, err);
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
