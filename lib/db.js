'use strict';

const { config, Honeybadger } = require('./utils');

// Bring Mongoose into the app
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const connect = function connect (connectionString) {

  if (!connectionString) {
    connectionString = config.dbconnectionstring;
  }

  mongoose.connection.on('connecting', function () {
    console.log(`${new Date().toISOString()}: trying to connect to MongoDB...`);
  });

  // Create the database connection
  return new Promise(function (resolve, reject) {
    mongoose.connect(connectionString, {
      keepAlive: 10000,
      server: {
        auto_reconnect: true,
        reconnectTries: Number.MAX_VALUE,
        socketOptions: {
          keepAlive: 10000,
          connectTimeoutMS: 10000,
          socketTimeoutMS: 30000
        }
      },
      replset: {
        socketOptions: {
          keepAlive: 10000,
          connectTimeoutMS: 30000
        }
      },
      promiseLibrary: global.Promise
    })
    .then(function () {
      // CONNECTION EVENTS

      // If the connection throws an error
      mongoose.connection.on('error', function (err) {
        console.log(`${new Date().toISOString()}: Mongoose connection error: ${err}`);
        Honeybadger.notify(err);
      });

      // When the connection is disconnected
      mongoose.connection.on('disconnected', function () {
        console.log(`${new Date().toISOString()}: Mongoose connection disconnected. Retrying with mongo AutoReconnect.`);
      });

      // When the connection is resconnected
      mongoose.connection.on('reconnected', function () {
        console.log(`${new Date().toISOString()}: Mongoose connection reconnected.`);
      });

      console.log(`${new Date().toISOString()}: Successfully connected to MongoDB.`);

      return resolve();
    })
    .catch(function (err) {
      // only called if the initial mongoose.connect fails on first connect
      if (err.message.startsWith('failed to connect to server')) {
        console.log(`${new Date().toISOString()}: Error ${err.message} - retrying manually in 1 second.`);
        mongoose.connection.removeAllListeners();

        return new Promise(function () {
          setTimeout(function () {
            resolve(connect());
          }, 1000);
        });
      }
      console.log(`${new Date().toISOString()}: ${err.name} ${err.message}`);

      return reject(err);
    });
  });
};

module.exports = {
  connect,
  mongoose
};
