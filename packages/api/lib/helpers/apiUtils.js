'use strict';

const escapeMarkdown = require('./escapeMarkdown');

const { NotAuthorizedError, UnsupportedMediaTypeError } = require('restify-errors'),
  config = require('config'),
  apicache = require('apicache'),
  got = require('got'),
  { stringify } = require('csv-stringify'),
  hostname = require('os').hostname();

const addCache = function addCache (duration, group) {
  // configure the apicache, set the group and only cache response code 200 responses
  const apicacheMiddlewareFunction = function apicacheMiddlewareFunction (req, res) {
    req.apicacheGroup = group;

    return res.statusCode === 200;
  };

  return apicache.middleware(duration, apicacheMiddlewareFunction);
};

const clearCache = function clearCache (identifiers) {
  if (Array.isArray(identifiers)) {
    for (const identifier of identifiers) {
      apicache.clear(identifier);
    }
  } else {
    apicache.clear(identifiers);
  }
};

/**
 * @apiDefine ContentTypeJSON
 *
 * @apiHeader {String="application/json","application/json; charset=utf-8"} content-type
 * @apiError {Object} 415 the request has invalid or missing content type.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 415 Unsupported Media Type
 *     {"code":"NotAuthorized","message":"Unsupported content-type. Try application/json"}
 */
const checkContentType = function (req, res, next) {
  if (!req.is('json')) {
    return next(new UnsupportedMediaTypeError('Unsupported content-type. Try application/json'));
  }

  return next();
};

const validUnsecuredPathRegex = new RegExp(`^\\${config.get('routes.boxes')}/[a-f\\d]{24}/((data)|([a-f\\d]{24}))/?$`, 'i');
const preRequest = function preRequest (request, response, next) {
  response.charSet('utf-8');
  request.log.info({ req: request });

  if (process.env.NODE_ENV === 'production'
    && (!request.headers['x-forwarded-proto'] || request.headers['x-forwarded-proto'] !== 'https')) {
    if (request.method !== 'POST' || !validUnsecuredPathRegex.test(request.url)) {
      return next(new NotAuthorizedError('Access through http is not allowed'));
    }
  }

  return next();
};

// sends out CORS headers
const preCors = function preCors (request, response, next) {
  if (!response.getHeader('access-control-allow-origin')) {
    response.header('access-control-allow-origin', '*');
  }

  if (!response.getHeader('access-control-allow-methods')) {
    const allowedMethods = new Set(['OPTIONS']);
    if (request.header('access-control-request-method')) {
      allowedMethods.add(request.header('access-control-request-method').toUpperCase());
    }
    allowedMethods.add(request.method.toUpperCase());

    response.header('access-control-allow-methods', Array.from(allowedMethods)
      .reverse()
      .join(', '));
  }

  if (!response.getHeader('access-control-allow-headers')) {
    const allowedHeaders = new Set(['authorization']);
    if (request.header('access-control-request-headers')) {
      allowedHeaders.add(request.header('access-control-request-headers').toLowerCase());
    }

    response.header('access-control-allow-headers', Array.from(allowedHeaders).join(', '));
  }

  if (!response.getHeader('access-control-max-age')) {
    response.header('access-control-max-age', 600);
  }

  if (!response.getHeader('access-control-expose-headers')) {
    response.header('access-control-expose-headers', 'content-disposition');
  }

  if (request.method === 'OPTIONS') {
    return response.send(204);
  }

  return next();
};

let Sentry = {};

/* eslint-disable global-require */
if (config.get('sentry') && config.has('sentry.dsn') && config.get('sentry.dsn').length > 0) {
  const sentryConfig = Object.assign({}, config.get('sentry'));
  Sentry = require('@sentry/node');
  Sentry.init(sentryConfig);
}
/* eslint-enable global-require */



const postToSlack = function postToSlack (text) {
  if (config.get('slack_url')) {
    text = `[${hostname}]: ${text}`;
    got.post(config.get('slack_url'), {
      json: { text },
      retry: 0
    })
      // swallow errors, we don't care
      .catch(() => { });
  }
};

const postToMattermost = function postToMattermost (text) {
  if (config.get('mattermost_url')) {
    text = `[${hostname}]: ${text}`;
    got
      .post(config.get('mattermost_url'), {
        json: { text: escapeMarkdown(text) },
        retry: 0,
      })
      // swallow errors, we don't care
      .catch(() => {});
  }
};

const redactEmail = function redactEmail (email) {
  /* eslint-disable prefer-const */
  let [name = '', domain = ''] = email.split('@');
  /* eslint-enable prefer-const */

  let [hostname = '', tld = ''] = domain.split('.');

  tld = `${tld.slice(0, 1)}**`;
  hostname = `${hostname.slice(0, 3)}****`;
  name = `${name.slice(0, 3)}****`;

  return `${name}@${hostname}.${tld}`;
};

const getVersion = (function () {
  try {
    /* eslint-disable global-require */
    const version = require('../../../../version');
    /* eslint-enable global-require */

    return version;
  } catch (err) {
    return 'unknown version';
  }
})();

const createDownloadFilename = function createDownloadFilename (date, action, params, format) {
  return `opensensemap_org-${action}-${encodeURI(encodeURI(params.join('-')))}-${date.toISOString()
    .replace(/-|:|\.\d*Z/g, '')
    .replace('T', '_')}.${format}`;
};

//                        1d        1h       1m
const truncationValues = [86400000, 3600000, 60000];
// 19 = seconds
// 16 = minutes
// 13 = hours
// 10 = days
// 7 = month
// const substrVals = [19, 16, 13, 10, 7];
const substrVals = [10, 13, 16];
const computeTimestampTruncationLength = function computeTimestampTruncationLength (window) {

  for (const [i, v] of truncationValues.entries()) {
    if (window % v === 0) {
      return substrVals[i];
    }
    // subStrEnd = substrVals[i];
  }

  return 23;

};

const csvStringifier = function csvStringifier (columns, delimiter) {
  return stringify({
    columns, delimiter, header: 1, cast: {
      date: d => d.toISOString()
    }
  });
};

module.exports = {
  addCache,
  clearCache,
  checkContentType,
  preRequest,
  preCors,
  Sentry,
  postToSlack,
  postToMattermost,
  getVersion,
  redactEmail,
  createDownloadFilename,
  computeTimestampTruncationLength,
  csvStringifier
};
