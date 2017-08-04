'use strict';

const { NotAuthorizedError, UnsupportedMediaTypeError } = require('restify-errors'),
  { config: { basePath } } = require('../utils'),
  apicache = require('apicache');

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

const validUnsecuredPathRegex = new RegExp(`^\\${basePath}/[a-f\\d]{24}/((data)|([a-f\\d]{24}))/?$`, 'i');
const preRequest = function preRequest (request, response, next) {
  response.charSet('utf-8');
  request.log.info({ req: request }, 'REQUEST');

  if (process.env.ENV === 'prod'
    && (!request.headers['x-forwarded-proto'] || request.headers['x-forwarded-proto'] !== 'https')) {
    if (request.method !== 'POST' || !validUnsecuredPathRegex.test(request.url)) {
      return next(new NotAuthorizedError('Access through http is not allowed'));
    }
  }

  return next();
};

module.exports = {
  addCache,
  clearCache,
  checkContentType,
  preRequest
};
