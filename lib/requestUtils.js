'use strict';

const restify = require('restify'),
  utils = require('./utils'),
  Honeybadger = utils.Honeybadger,
  cfg = utils.config,
  mongoose = require('mongoose'),
  models = require('../lib/models'),
  User = models.User,
  moment = require('moment');

const checkContentType = function (req, res, next) {
  if (!req.is('json')) {
    return next(new restify.UnsupportedMediaTypeError('Unsupported content-type. Try application/json'));
  }

  return next();
};

const decodeBase64Image = function (dataString) {
  const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
};

let retrieveParameter = function (paramName, paramDataType, defaultValueOrRequired, allowedValues) {
  return function (req, res, next) {
    let param = req.params[paramName];
    if (typeof param === 'undefined' || param.toString().trim() === '') {
      if (typeof defaultValueOrRequired === Boolean && defaultValueOrRequired === true) {
        return next(new restify.BadRequestError('missing parameter ' + paramName));
      } else {
        req[paramName] = defaultValueOrRequired;
        return next();
      }
    }
    param = param.toString().trim();

    switch (paramDataType) {
    case 'Number':
      param = Number.parseFloat(param);
      break;
    case 'Integer':
      param = Number.parseInt(param, 10);
      break;
    }

    if (paramDataType === 'Number' && Number.isNaN(param)) {
      return next(new restify.UnprocessableEntityError('parameter ' + paramName + ' is not parseable as datatype ' + paramDataType));
    }

    if (typeof allowedValues === 'undefined') {
      req[paramName] = param;
      return next();
    }

    if (!Array.isArray(allowedValues)) {
      allowedValues = [allowedValues];
    }

    if (allowedValues.includes(param)) {
      req[paramName] = param;
      return next();
    } else {
      return next(new restify.UnprocessableEntityError('illegal value for parameter ' + paramName + '. allowed values: ' + allowedValues.join(', ')));
    }
  };
};


/**
 * @apiDefine SeparatorParam
 *
 * @apiParam {String="comma"} [separator] Only for csv: the separator for csv. Possible values: `comma` for comma as separator, everything else: semicolon. Per default a semicolon is used. Alternatively you can use delimiter as parameter name.
 */

// helper to determine the requested separator for csv
const getDelimiter = function (req) {
  let param = req.params['separator'];
  if (typeof param === 'undefined') {
    param = req.params['delimiter'];
  }

  if (typeof param !== 'undefined' && param.trim().toLowerCase() === 'comma') {
    return ',';
  }

  return ';';
};

// helper function to determine the requested format
const getRequestedFormat = function (req, allowed_formats, default_format) {
  if (typeof req.params['format'] === 'undefined' || req.params['format'].trim() === '') {
    return default_format;
  } else if (allowed_formats.indexOf(req.params['format'].trim().toLowerCase()) !== -1) {
    return req.params['format'].trim().toLowerCase();
  }
};

const validateAuthenticationRequest = function (req, res, next) {
  if (req.headers['x-apikey'] && req.boxId) {
    User.findOne({ apikey: req.headers['x-apikey'], boxes: { $in: [ req.boxId ] } })
      .then(function (user) {
        if (user && user.boxes.length > 0) {
          const boxIds = user.boxes.map(boxId => boxId.toString());
          if (boxIds.includes(req.boxId)) {
            req.authorized_user = user;

            return next();
          }
        }
        next(new restify.NotAuthorizedError('ApiKey is invalid or missing'));
      })
      .catch(function (err) {
        console.log(err);
        Honeybadger.notify(err);
        next(new restify.InternalServerError());
      });
  } else {
    return next(new restify.NotAuthorizedError('ApiKey is invalid or missing'));
  }
};
const VALID_BOX_ID_PARAMS = [ 'senseboxid', 'senseboxids', 'boxid', 'boxids' ];

const validateIdParams = function (req, res, next) {
  // check parmeters for possible box Id parameters
  // everything of the like
  // 'boxId', 'boxid', 'senseBoxIds', 'senseBoxId'
  // can be used
  let boxIdParamName;
  for (const param of Object.keys(req.params)) {
    if (VALID_BOX_ID_PARAMS.includes(param.toLowerCase())) {
      boxIdParamName = param;
      req.boxId = req.params[param].toString();
      break;
    }
  }

  if (typeof req.boxId !== 'undefined') {
    let boxId = req.boxId;
    if (boxId.indexOf(',') !== -1) {
      boxId = boxId.split(',');
    } else {
      boxId = [boxId];
    }
    if (boxId.some(id => !mongoose.Types.ObjectId.isValid(id))) {
      return next(new restify.BadRequestError(`Parameter :${boxIdParamName} is not valid`));
    }
  }

  if (typeof req.params['sensorId'] !== 'undefined') {
    const sensorId = req.params['sensorId'].toString();
    if (sensorId && !mongoose.Types.ObjectId.isValid(sensorId)) {
      return next(new restify.BadRequestError('Parameter :sensorId is not valid'));
    }
  }
  next();
};

/**
 * @apiDefine BBoxParam
 *
 * @apiParam {String} bbox A bounding box containing 4 WGS84 coordinates separated by comata (,). Order is latitude, longitude and southwest, northeast.
 */

const validateBboxParam = function (req, res, next) {
  if (req.params['bbox'] && req.params['bbox'].trim() !== '') {
    //
    let parts = req.params['bbox'].split(',');
    if (parts.length !== 4) {
      return next(new restify.UnprocessableEntityError('too few coordinates in bbox parameter'));
    }

    // try to parse to float
    parts = parts.map(p => parseFloat(p));
    if (parts.some(p => Number.isNaN(p))) {
      return next(new restify.UnprocessableEntityError('invalid number in bbox parameter'));
    }

    req.bbox = parts;
  }

  return next();
};

const validUnsecuredPathRegex = new RegExp(`^\\${cfg.basePath}\/[a-f\\d]{24}\/((data)|([a-f\\d]{24}))\/?$`, 'i');
const checkUnsecuredAccess = function (request, response, next) {
  response.charSet('utf-8');
  request.log.info({ req: request }, 'REQUEST');

  if (process.env.ENV === 'prod'
    && (!request.headers['x-forwarded-proto'] || request.headers['x-forwarded-proto'] !== 'https')) {
    if (request.method !== 'POST' || !validUnsecuredPathRegex.test(request.url)) {
      return next(new restify.NotAuthorizedError('Access through http is not allowed'));
    }
  }

  return next();
};

// function to parse timestamp from request parameter
// allows to specify a default in case of undefined
let parseTimeParameter = function (req, paramName, defaultValue) {
  let param = req.params[paramName];
  if (typeof param === 'undefined' || param.trim() === '') {
    req[paramName] = defaultValue;
    return;
  }

  let parsedTime = utils.parseTimestamp(param);

  if (parsedTime.isValid()) {
    req[paramName] = parsedTime;
  } else {
    return new restify.UnprocessableEntityError('Invalid date format for parameter ' + paramName);
  }
};

let validateTimeParameters = function (req) {
  let now = moment().utc(),
    toDate = req['to-date'],
    fromDate = req['from-date'];
  if (toDate.isAfter(now)) {
    return new restify.UnprocessableEntityError('Invalid time frame specified: to-date is in the future');
  }
  if (fromDate.isAfter(now)) {
    return new restify.UnprocessableEntityError('Invalid time frame specified: from-date is in the future');
  }

  if (fromDate.isAfter(toDate)) {
    return new restify.InvalidArgumentError('Invalid time frame specified: from-date (' + fromDate.format() + ') is after to-date (' + toDate.format() + ')');
  }

  if (Math.abs(toDate.diff(fromDate, 'days')) > 31) {
    return new restify.InvalidArgumentError('Please choose a time frame up to 31 days maximum');
  }
};

let parseAndValidateTimeParams = function (req, res, next) {
  // default to now
  let toDateResult = parseTimeParameter(req, 'to-date', moment().utc());
  if (typeof toDateResult !== 'undefined') {
    return next(toDateResult);
  }

 // default to 2 days earlier
  var fromDateResult = parseTimeParameter(req, 'from-date', req['to-date'].clone().subtract(2, 'days'));
  if (typeof fromDateResult !== 'undefined') {
    return next(fromDateResult);
  }

 // validate time parameters
  var timesValid = validateTimeParameters(req);
  if (typeof timesValid !== 'undefined') {
    return next(timesValid);
  }
  next();
};

module.exports = {
  getRequestedFormat,
  getDelimiter,
  decodeBase64Image,
  checkContentType,
  validateAuthenticationRequest,
  validateIdParams,
  checkUnsecuredAccess,
  validateBboxParam,
  parseAndValidateTimeParams,
  retrieveParameter
};
