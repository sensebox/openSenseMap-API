'use strict';
/**
 * define for the MQTT options
 * @apiDefine MqttOption Settings for a senseBox connected through MQTT
 */

/**
 * @apiDefine MqttBody
 *
 * @apiParam (MqttOption) {String} url the url to the mqtt server.
 * @apiParam (MqttOption) {String} topic the topic to subscribe to.
 * @apiParam (MqttOption) {String="json","csv"} messageFormat the format the mqtt messages are in.
 * @apiParam (MqttOption) {String} decodeOptions a json encoded string with options for decoding the message. 'jsonPath' for 'json' messageFormat.
 * @apiParam (MqttOption) {String} connectionOptions a json encoded string with options to supply to the mqtt client (https://github.com/mqttjs/MQTT.js#client)
 *
 */


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
      client.subscribe(box.mqtt.topic, function (err) {
        if (err) {
          return reject(err);
        }
        mqttConnections[box._id] = client;
        return resolve(client);
      });
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
            // query the database for the box, then save the measurements
            // should help with the version error
            // box.constructor is the model
            box.constructor.findOne({ _id: box._id })
              .then(function (box) {
                let msgStr = message.toString();
                let decoded = handler.decodeMessage(msgStr, decodeOptions);
                return box.saveMeasurementsArray(decoded);
              })
              .then(function (result) {
                if (result.length !== 0) {
                  console.log('received, decoded and saved mqtt message for box', box._id);
                }
              })
              .catch(function (err) {
                console.log('error saving mqtt message for box', box._id, 'error:', err, 'message:', message.toString());
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
