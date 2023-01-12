/**
 * This is the openSenseMap API source code!
 * Booya!
 */

/**
 * define for Datetype parameters
 * @apiDefine RFC3339Date A [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) formatted timestamp. Will be parsed by MomentJS with enabled strict mode
 */

'use strict';

const
  { db } = require('@sensebox/opensensemap-api-models'),
  restify = require('restify'),
  { fullResponse, queryParser, jsonBodyParser, pre: { sanitizePath } } = restify.plugins,
  config = require('config'),
  { preRequest, preCors, Sentry, getVersion, postToMattermost } = require('./lib/helpers/apiUtils'),
  routes = require('./lib/routes'),
  pino = require('pino');

// const log = bunyan.createLogger({ name: 'opensensemap-api', serializers: bunyan.stdSerializers });
const log = pino({ name: 'opensensemap-api', sserializers: pino.stdSerializers });

const server = restify.createServer({
  name: `opensensemap-api (${getVersion})`,
  log,
  onceNext: true,
  strictNext: false,
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

db.connect()
  .then(function () {
    // attach Routes
    routes(server);

    // start the server
    server.listen(Number(config.get('port')), function () {
      log.info(`${server.name} listening at ${server.url}`);
      postToMattermost(`openSenseMap API started. Version: ${getVersion}`);
    });
  })
  .catch(function (err) {
    log.fatal(err, `Couldn't connect to MongoDB.
    Exiting...`);
    process.exit(1);
  });

// InternalServerError is the only error we want to report to Sentry...
server.on('InternalServer', function (req, res, err, callback) {
  // Pass some request information to sentry
  Sentry.setContext('request', {
    headers: req.headers,
    method: req.method,
    url: req.url,
    httpVersion: req.httpVersion,
    params: req.params,
    rawBody: req.rawBody,
    body: req.body,
    _body: req._body,
    query: req.query,
    _userParams: req._userParams,
  });
  log.error(err);

  // Notify Sentry
  Sentry.captureException(err);

  return callback();
});
