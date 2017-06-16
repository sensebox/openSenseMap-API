'use strict';

const mqtt = require('mqtt'),
  decodeHandlers = require('../decoding'),
  connOptsParser = require('./connectionOptionsParser'),
  log = require('../log');

const RETRY_AFTER_MINUTES = 10;

// use this object as simple key/value store for connecting/disconnecting
const mqttConnections = {};

const _retryAfter = function (box, afterMinutes) {
  const theBox = box;
  setTimeout(function () {
    connect(theBox);
  }, afterMinutes * 60000);
};

const _connect = function (box, maxRetries) {
  // parse mqtt connection options
  const connectionOptions = connOptsParser.parse(box.integrations.mqtt.connectionOptions);
  let errRetries = maxRetries,
    closeRetries = maxRetries;

  const client = mqtt.connect(box.integrations.mqtt.url, connectionOptions);
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

        return reject(`connection closed after 5 retries because of ${err}. Retry after ${RETRY_AFTER_MINUTES} minutes`);
      }
    });

    client.on('close', function () {
      closeRetries = closeRetries - 1;
      if (closeRetries === 0) {
        client.reconnecting = false;
        client.end(true);

        // retry after..
        _retryAfter(box, RETRY_AFTER_MINUTES);

        return reject(`connection closed after 5 retries. Retry after ${RETRY_AFTER_MINUTES} minutes`);
      }
    });

    client.on('connect', function () {
      log.info(`connected mqtt for box ${box._id}`);
      client.subscribe(box.integrations.mqtt.topic, function (err) {
        if (err) {
          return reject(err);
        }
        mqttConnections[box._id] = client;

        return resolve(client);
      });
    });
  });
};

const connect = function (box) {
  // disconnect any running connections before reconnecting..
  disconnect(box);
  if (box.integrations.mqtt && box.integrations.mqtt.url !== '') {
    const mqttCfg = box.integrations.mqtt;
    const handler = decodeHandlers[mqttCfg.messageFormat];

    if (mqttCfg.url && mqttCfg.topic && handler) {
      _connect(box, 5)
        .then(function (client) {
          let decodeOptions;
          try {
            decodeOptions = JSON.parse(mqttCfg.decodeOptions);
          } catch (e) {
            log.warn(`mqtt decode options of box ${box._id} not parseable`);
          }

          client.on('close', function () {
            log.info(`mqtt closed for box: ${box._id}`);
          });

          client.on('message', function (topic, message) {
            // query the database for the box, then save the measurements
            // should help with the version error
            // box.constructor is the model
            const msgStr = message.toString();

            Promise.all([box.constructor.findOne({ _id: box._id }), handler.decodeMessage(msgStr, decodeOptions)])
              .then(function (results) {
                const [ box, decoded ] = results;

                return box.saveMeasurementsArray(decoded);
              })
              .then(function (result) {
                if (result.length !== 0) {
                  log.info(`received, decoded and saved mqtt message for box ${box._id}`);
                }
              })
              .catch(function (err) {
                log.error(err, `error saving mqtt message for box ${box._id}`);
              });
          });
        })
        .catch(function (err) {
          log.error(err, `mqtt error for box ${box._id}`);
        });
    }
  }
};

const disconnect = function (box) {
  if (mqttConnections[box._id]) {
    mqttConnections[box._id].end(true);
    mqttConnections[box._id] = undefined;
    log.info(`mqtt disconnected mqtt for box ${box._id}`);
  }
};

module.exports = {
  connect: connect,
  disconnect: disconnect
};
