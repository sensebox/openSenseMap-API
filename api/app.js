/**
 * This is the openSenseMap API source code!
 * Booya!
 */

/**
 * define for Datetype parameters
 * @apiDefine ISO8601Date A ISO8601 formatted timestamp. Will be parsed by MomentJS with enabled strict mode
 */

'use strict';

const restify = require('restify'),
  { fullResponse, queryParser, jsonBodyParser, pre: { sanitizePath } } = restify.plugins,
  config = require('./src/config'),
  { preRequest, preCors, Honeybadger, softwareRevision, postToSlack } = require('./src/helpers/apiUtils'),
  routes = require('./src/routes'),
  passport = require('passport'),
  log = require('./src/log'),
  { db } = require('@sensebox/opensensemap-api-models');

const server = restify.createServer({
  name: `opensensemap-api (${softwareRevision})`,
  log: log
});

// We're using caddy as proxy. It supplies a 'X-Forwarded-Proto' header
// which contains the request scheme (http/https)
// respond every GET request with a notice to use the https api.
// Also allow POST measurements through unsecured
// /boxes/:boxId/data and /boxes/:boxId/:sensorId for arduinos
// and set utf-8 charset
server.pre(preRequest);
server.pre(preCors);
server.pre(sanitizePath());

server.use(fullResponse());
server.use(queryParser());
server.use(jsonBodyParser());

server.use(passport.initialize());

// attach Routes
routes(server);

db.connect()
  .then(function () {
    server.listen(config.port, function () {
      log.info(`${server.name} listening at ${server.url}`);
      postToSlack(`openSenseMap API started. Revision: ${softwareRevision}`);
    });
  })
  .catch(function (err) {
    log.fatal(err, `Couldn't connect to MongoDB.
    Exiting...`);
    process.exit(1);
  });

// InternalServerError is the only error we want to report to Honeybadger..
server.on('InternalServer', function (req, res, err, callback) {
  // set honeybadger context
  Honeybadger.resetContext({
    headers: req.headers,
    method: req.method,
    url: req.url,
    httpVersion: req.httpVersion,
    params: req.params,
    rawBody: req.rawBody,
    body: req.body,
    _body: req._body,
    query: req.query,
    _userParams: req._userParams
  });
  log.error(err);
  // and notify
  Honeybadger.notify(err);

  return callback();
});
