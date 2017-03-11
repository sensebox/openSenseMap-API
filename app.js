/**
 * This is the openSenseMap API source code!
 * Booya!
 */

'use strict';

const restify = require('restify'),
  Stream = require('stream'),
  utils = require('./lib/utils'),
  requestUtils = require('./lib/requestUtils'),
  Box = require('./lib/models').Box,
  routes = require('./lib/routes'),
  passport = require('passport');

const { config, Honeybadger } = utils;

// Logging
const consoleStream = new Stream();
consoleStream.writable = true;
consoleStream.write = function (obj) {
  if (obj.req) {
    console.log(obj.time, obj.req.remoteAddress, obj.req.method, obj.req.url);
  } else if (obj.msg) {
    console.log(obj.time, obj.msg);
  } else {
    //console.log(obj.time, obj);
  }
};

const Logger = require('bunyan'),
  reqlog = new Logger.createLogger({
    name: 'OSeM-API',
    streams: [
      { level: 'debug', type: 'raw', stream: consoleStream }
    ],
    serializers: {
      err: Logger.stdSerializers.err,
      req: Logger.stdSerializers.req,
      res: Logger.stdSerializers.res
    }
  }),
  log = new Logger.createLogger({
    name: 'OSeM-API',
    streams: [
      { level: 'debug', type: 'raw', stream: consoleStream }
    ],
    serializers: {
      err: Logger.stdSerializers.err,
      req: Logger.stdSerializers.req,
      res: Logger.stdSerializers.res
    }
  });

const server = restify.createServer({
  name: `opensensemap-api (${utils.softwareRevision})`,
  version: '0.0.1',
  log: reqlog
});

// We're using caddy as proxy. It supplies a 'X-Forwarded-Proto' header
// which contains the request scheme (http/https)
// respond every GET request with a notice to use the https api.
// Also allow POST measurements through unsecured
// /boxes/:boxId/data and /boxes/:boxId/:sensorId for arduinos
// and set utf-8 charset
// and set context for honeybadger
server.pre(requestUtils.preRequest);

server.use(restify.CORS({ 'origins': ['*'] }));
server.use(restify.fullResponse());
server.use(restify.queryParser());
server.use(restify.jsonBodyParser());
server.pre(restify.pre.sanitizePath());

server.use(passport.initialize());

// attach Routes
routes(server);

const unknownMethodHandler = function unknownMethodHandler (req, res) {
  if (req.method.toLowerCase() === 'options') {
    const allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With', 'Authorization']; // added Origin & X-Requested-With

    if (res.methods.indexOf('OPTIONS') === -1) {
      res.methods.push('OPTIONS');
    }

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(204);
  }

  return res.send(new restify.MethodNotAllowedError());
};

server.on('MethodNotAllowed', unknownMethodHandler);

utils.connectWithRetry(function () {
  server.listen(config.port, function () {
    console.log('%s listening at %s', server.name, server.url);
    utils.postToSlack(`openSenseMap API started. Revision: ${utils.softwareRevision}`);
    Box.connectMQTTBoxes();
  });
});

server.on('uncaughtException', function (req, res, route, err) {
  Honeybadger.notify(err);
  log.error('Uncaught error', err);
  console.log(err.stack);

  // check if headers were sent..
  if (res._headerSent === true) {
    return res.end(`An error occured: ${err}`);
  }

  return res.send(500, `An error occured: ${err}`);
});
