'use strict';

const config = require('config').get('openSenseMap-API-models.db'),
  log = require('./log');

// Bring Mongoose into the app
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.set('debug', process.env.NODE_ENV !== 'production');

const getDBUri = function getDBUri (uri) {
  // if available, use user specified db connection uri
  if (uri) {
    return uri;
  }

  // get uri from config
  uri = config.get('mongo_uri');
  if (uri) {
    return uri;
  }

  // otherwise build uri from config supplied values
  const { user, userpass, host, port, db, authsource } = config;

  return `mongodb://${user}:${userpass}@${host}:${port}/${db}?authSource=${authsource}`;
};

const connect = function connect (uri) {
  uri = getDBUri(uri);

  mongoose.connection.on('connecting', function () {
    log.info('trying to connect to MongoDB...');
  });

  // Create the database connection
  return new Promise(function (resolve, reject) {
    mongoose
      .connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        reconnectTries: Number.MAX_VALUE,
        promiseLibrary: global.Promise
      })
      .then(function () {
        // CONNECTION EVENTS

        // If the connection throws an error
        mongoose.connection.on('error', function (err) {
          log.error(err, 'Mongoose connection error');
          throw err;
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
