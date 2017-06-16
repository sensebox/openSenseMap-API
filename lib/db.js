'use strict';

const { config, Honeybadger } = require('./utils'),
  log = require('./log');

// Bring Mongoose into the app
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.set('debug', !config.isProdEnv());

const serverOptions = {
  auto_reconnect: true,
  reconnectTries: Number.MAX_VALUE,
  socketOptions: {
    keepAlive: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000
  }
};

const connect = function connect (connectionString) {

  if (!connectionString) {
    connectionString = config.dbconnectionstring;
  }

  mongoose.connection.on('connecting', function () {
    log.info('trying to connect to MongoDB...');
  });

  // Create the database connection
  return new Promise(function (resolve, reject) {
    mongoose.connect(connectionString, {
      keepAlive: 10000,
      server: serverOptions,
      replset: serverOptions,
      promiseLibrary: global.Promise,
      config: {
        autoIndex: !config.isProdEnv()
      }
    })
    .then(function () {
      // CONNECTION EVENTS

      // If the connection throws an error
      mongoose.connection.on('error', function (err) {
        log.fatal(err, 'Mongoose connection error');
        Honeybadger.notify(err);
      });

      // When the connection is disconnected
      mongoose.connection.on('disconnected', function () {
        log.warn('Mongoose connection disconnected. Retrying with mongo AutoReconnect.');
      });

      // When the connection is resconnected
      mongoose.connection.on('reconnected', function () {
        log.info('Mongoose connection reconnected.');
      });

      log.info('Successfully connected to MongoDB.');

      return resolve();
    })
    .catch(function (err) {
      // only called if the initial mongoose.connect fails on first connect
      if (err.message.startsWith('failed to connect to server')) {
        log.info(`Error ${err.message} - retrying manually in 1 second.`);
        mongoose.connection.removeAllListeners();

        return new Promise(function () {
          setTimeout(function () {
            resolve(connect());
          }, 1000);
        });
      }

      return reject(err);
    });
  });
};

module.exports = {
  connect,
  mongoose
};
