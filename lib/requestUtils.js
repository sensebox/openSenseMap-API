'use strict';

const restify = require('restify'),
  utils = require('./utils'),
  Honeybadger = utils.Honeybadger,
  cfg = utils.config,
  { mongoose } = require('./db'),
  models = require('../lib/models'),
  User = models.User,
  moment = require('moment'),
  apicache = require('apicache'),
  log = require('./log');

/**
 * @apiDefine ContentTypeJSON
 *
 * @apiHeader {String=application/json} content-type Should be `application/json` or `application/json; charset=utf-8`
 * @apiError {Object} 415 the request has invalid or missing content type.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 415 Unsupported Media Type
 *     {"code":"NotAuthorized","message":"Unsupported content-type. Try application/json"}
 */
const checkContentType = function (req, res, next) {
  if (!req.is('json')) {
    return next(new restify.UnsupportedMediaTypeError('Unsupported content-type. Try application/json'));
  }

  return next();
};

const decodeBase64Image = function (dataString) {
  const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
};

const getParam = function getParam (req, paramNames, paramDataType) {
  for (const paramName of paramNames) {
    if (typeof req.params[paramName] !== 'undefined' && req.params[paramName].toString().trim() !== '') {
      if (paramDataType === 'Array' || paramDataType === 'object') {
        return { param: req.params[paramName], paramName };
      }

      if (paramDataType !== 'Array' && Array.isArray(req.params[paramName])) {
        return { param: undefined, paramName: undefined, error: new restify.BadRequestError(`Parameter ${paramName} must only be specified once`) };
      }

      return { param: req.params[paramName].toString().trim(), paramName };

    }
  }

  return { param: undefined, paramName: undefined };
};

const checkParamAllowed = function checkParamAllowed (param, allowedValues) {
  if (typeof allowedValues === 'undefined') {
    return true;
  }

  if (!Array.isArray(allowedValues)) {
    allowedValues = [allowedValues];
  }

  for (const p of param) {
    if (!allowedValues.includes(p)) {
      return false;
    }
  }

  return true;
};

const castParam = function castParam (param, paramDataType) {
  let parser, check, checkResult;
  switch (paramDataType) {
  case 'Number':
    parser = Number.parseFloat;
    check = Number.isNaN;
    checkResult = true;
    break;
  case 'ISO8601':
    parser = utils.parseTimestamp;
    check = utils.timeIsValid;
    checkResult = false;
    break;
  case 'String':
    param = param.map(p => p.trim());
    break;
  }

  if (parser && check && typeof checkResult !== 'undefined') {
    for (let i = 0, len = param.length; i < len; i++) {
      param[i] = parser(param[i]);
      if (check(param[i]) === checkResult) {
        return;
      }
    }
  }

  return param;
};

const initUserParams = function initUserParams (req, res, next) {
  if (!req._userParams) {
    req._userParams = Object.create(null);
  }

  next();
};

const setUserParam = function setUserParam (req, paramName, paramValue) {
  req._userParams[paramName] = paramValue;
};

const extractParam = function extractParam ({ params, name, aliases }) {
  // try to retrieve parameter by name
  let value = params[name];
  let nameUsed = name;
  // if there was no value and aliases are defined
  if (typeof value === 'undefined' && aliases) {
    // iterate over aliases and try to find the parameter
    for (const alias of aliases) {
      if (alias in params) {
        value = params[alias];
        nameUsed = `${name} (${alias})`;
        break;
      }
    }
  }

  return { value, nameUsed };
};

const ARRAY_NOT_ALLOWED = 1,
  CAST_FAILED = 2,
  ILLEGAL_VALUE = 3;

const validateAndCastParam = function validateAndCastParam ({ value, dataType, allowedValues, mapping }) {
  // if the dataType is an Array, allow Arrays or split by comma (,)
  const dataTypeIsArray = Array.isArray(dataType);
  // wrap dataType in array for calling of casting function
  dataType = (dataTypeIsArray ? dataType[0] : dataType);
  if (!dataTypeIsArray && Array.isArray(value)) {
    return { error: ARRAY_NOT_ALLOWED };
  }

  // wrap value in array if neccessary
  value = (Array.isArray(value) ? value : [value]);

  // test and cast value against dataType
  const castedValue = castParam(value, dataType);

  if (typeof castedValue === 'undefined') {
    return { error: CAST_FAILED };
  }

  // no allowedValues or no mapping === allow everything
  if (dataType[0] === 'object' || (typeof allowedValues === 'undefined' && typeof mapping === 'undefined')) {
    return { castedValue };
  }

  // check for mapping first, allowedValues will be ignored if mapping is set
  if (typeof mapping !== 'undefined') {
    // return error if not allowed
    if (!checkParamAllowed(value, Object.keys(mapping))) {
      return { error: ILLEGAL_VALUE };
    }

    // return mapped values
    return { castedValue: castedValue.map(v => mapping[v]) };
  }

  // there was no mapping, check against allowedValues
  if (typeof allowedValues !== 'undefined' && checkParamAllowed(value, allowedValues)) {
    return { castedValue };
  }

  return { error: ILLEGAL_VALUE };
};

// A single parameter has the following properties:
// name: String
// aliases: String[]
// dataType: ['String', ['String'], 'Number', ['Number'] 'object', ['object'], 'ISO8601', ['ISO8601']] // default: String
// allowedValues: String[]
// mapping: Object
// require: Boolean // default: false
// defaultValue: Anything
const retrieveParameters = function retrieveParameters (parameters = []) {
  return function (req, res, next) {
    for (const { name, aliases, dataType = 'String', allowedValues, mapping, required = false, defaultValue } of parameters) {

      // extract param from request
      const { value, nameUsed } = extractParam({ params: req.params, name, aliases });
      // there was no user supplied value but a default value
      if (typeof value === 'undefined' && typeof defaultValue !== 'undefined') {
        setUserParam(req, name, defaultValue);
        continue; // skip to next parameter
      } else if (typeof value === 'undefined' && required === true) {
        // no user supplied value and required -> error
        return next(new restify.BadRequestError(`missing required parameter ${name}`));
      } else if (typeof value === 'undefined' && required === false) {
        // no value and not required, skip to the next parameter
        continue;
      }

      // at this point we can assume the parameter was set
      // validate
      const { castedValue, error } = validateAndCastParam({ value, dataType, allowedValues, mapping });
      switch (error) {
      case ARRAY_NOT_ALLOWED:
        return next(new restify.BadRequestError(`Parameter ${nameUsed} must only be specified once`));
      case CAST_FAILED:
        return next(new restify.UnprocessableEntityError(`Parameter ${nameUsed} is not parseable as datatype ${(Array.isArray(dataType) ? dataType[0] : dataType)}`));
      case ILLEGAL_VALUE:
        return next(new restify.UnprocessableEntityError(`Illegal value for parameter ${nameUsed}. allowed values: ${allowedValues.join(', ')}`));
      }

      // no error matched
      setUserParam(req, name, (Array.isArray(dataType) ? castedValue : castedValue[0]));
    }

    return next();
  };
};

/**
 * Method to retrieve and cast parameter.
 * Parameters will be then availiable at the root request under the key supplied at @parameterName or the first item of @parameterName if Array
 *
 * @parameterName: String or Array of Strings. Array of Strings => Alternative names for the parameter
 * @paramDataType: if 'Number' -> parameter will be parseFloat-ed, if 'Array,' is prepended, the array is splited by ','. the other cast will also be applied
 * @defaultValueOrRequired if true -> will throw error if missing, otherwise if the parameter is omitted, this will be the value for the parameter supplied downwards
 * @allowedValues Single Item or Array -> parameter will be validated against this if supplied
 */
const retrieveParameter = function (parameterName, paramDataType, defaultValueOrRequired, allowedValues) {
  return function (req, res, next) {
    if (!Array.isArray(parameterName)) {
      parameterName = [parameterName];
    }

    /* eslint-disable prefer-const */
    let { param, paramName, error } = getParam(req, parameterName, paramDataType);
    /* eslint-enable prefer-const */

    if (error) {
      return next(error);
    }

    if (typeof param === 'undefined') {
      if (typeof defaultValueOrRequired === 'boolean' && defaultValueOrRequired === true) {
        return next(new restify.BadRequestError(`missing required parameter ${parameterName[0]}`));
      } else if (typeof defaultValueOrRequired === 'boolean' && defaultValueOrRequired === false) {
        return next();
      }
      setUserParam(req, parameterName[0], defaultValueOrRequired);

      return next();
    }
    let paramIsArray = false,
      dataType = paramDataType;

    // check if paramDataType contains Array,
    // then split the parameter
    if (paramDataType.startsWith('Array') && paramDataType !== 'Array') {
      dataType = paramDataType.split(',')[1];
      param = param.split(',');
      paramIsArray = true;
    } else { // otherwise wrap param in array
      param = [param];
    }

    param = castParam(param, dataType);

    if (typeof param === 'undefined') {
      return next(new restify.UnprocessableEntityError(`parameter ${paramName} is not parseable as datatype ${paramDataType}`));
    }

    let allowedValuesKeys;
    if (!Array.isArray(allowedValues) && typeof allowedValues === 'object') {
      allowedValuesKeys = Object.keys(allowedValues);
    } else {
      allowedValuesKeys = allowedValues;
    }

    if (checkParamAllowed(param, allowedValuesKeys)) {
      if (paramIsArray === false) {
        param = param[0];
        if (!Array.isArray(allowedValues) && typeof allowedValues === 'object') {
          param = allowedValues[param];
        }
      }

      setUserParam(req, parameterName[0], param);

      return next();
    }

    return next(new restify.UnprocessableEntityError(`illegal value for parameter ${paramName}. allowed values: ${allowedValuesKeys.join(', ')}`));
  };
};

const validateAuthenticationRequest = function (req, res, next) {
  if (req.headers['x-apikey'] && req._userParams.boxId) {
    User.findOne({ apikey: req.headers['x-apikey'], boxes: { $in: [ req._userParams.boxId ] } })
      .then(function (user) {
        if (user && user.boxes.length > 0) {
          const boxIds = user.boxes.map(boxId => boxId.toString());
          if (boxIds.includes(req._userParams.boxId)) {
            req.authorized_user = user;

            return next();
          }
        }
        next(new restify.NotAuthorizedError('ApiKey is invalid or missing'));
      })
      .catch(function (err) {
        log.error(err);
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
  let boxIdParamName,
    boxId;
  for (const param of Object.keys(req.params)) {
    if (VALID_BOX_ID_PARAMS.includes(param.toLowerCase())) {
      boxIdParamName = param;
      boxId = req.params[param].toString();
      break;
    }
  }

  if (typeof boxId !== 'undefined') {
    let isArray = false;
    if (boxId.includes(',')) {
      isArray = true;
      boxId = boxId.split(',');
    } else {
      boxId = [boxId];
    }
    if (boxId.some(function (id) {
      return !(mongoose.Types.ObjectId.isValid(id) && id !== '00112233445566778899aabb');
    })) {
      return next(new restify.BadRequestError(`Parameter :${boxIdParamName} is not valid`));
    }
    setUserParam(req, 'boxId', (isArray === true ? boxId : boxId[0]));
  }

  if (typeof req.params['sensorId'] !== 'undefined') {
    const sensorId = req.params['sensorId'].toString();
    if (sensorId && !mongoose.Types.ObjectId.isValid(sensorId)) {
      return next(new restify.BadRequestError('Parameter :sensorId is not valid'));
    }
    setUserParam(req, 'sensorId', sensorId);
  }
  next();
};

/**
 * @apiDefine BBoxParam
 *
 * @apiParam {String} bbox A bounding box containing 4 WGS84 coordinates separated by comata (,). Order is longitude, latitude and southwest, northeast.
 */

const validateBboxParam = function (req, res, next) {
  if (req._userParams.bbox) {
    const parts = req._userParams.bbox;
    if (parts.length !== 4) {
      return next(new restify.UnprocessableEntityError('too few coordinates in bbox parameter'));
    }

    setUserParam(req, 'bbox', {
      type: 'Polygon',
      coordinates: [ [
        [parts[0], parts[1]],
        [parts[0], parts[3]],
        [parts[2], parts[3]],
        [parts[2], parts[1]],
        [parts[0], parts[1]]
      ] ]
    });
  }

  return next();
};

const validUnsecuredPathRegex = new RegExp(`^\\${cfg.basePath}/[a-f\\d]{24}/((data)|([a-f\\d]{24}))/?$`, 'i');
const preRequest = function preRequest (request, response, next) {
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

const setHoneybadgerContext = function setHoneybadgerContext (request, response, next) {
  Honeybadger.resetContext({ headers: request.headers, method: request.method, url: request.url, httpVersion: request.httpVersion, params: request.params });
  next();
};

// function to parse timestamp from request parameter
// allows to specify a default in case of undefined
const parseTimeParameter = function (req, paramName, defaultValue) {
  const param = req.params[paramName];

  // check if the parameter was only specified once
  if (Array.isArray(param)) {
    return new restify.BadRequestError(`Parameter ${paramName} must only be specified once`);
  }

  if (typeof param === 'undefined' || param.trim() === '') {
    setUserParam(req, paramName, defaultValue);

    return;
  }

  const parsedTime = utils.parseTimestamp(param);

  if (parsedTime.isValid()) {
    setUserParam(req, paramName, parsedTime);
  } else {
    return new restify.UnprocessableEntityError(`Invalid date format for parameter ${paramName}`);
  }
};

const validateTimeParameters = function (req, noTimeLimit) {
  const now = moment().utc(),
    toDate = req._userParams['to-date'],
    fromDate = req._userParams['from-date'];
  if (toDate.isAfter(now)) {
    return new restify.UnprocessableEntityError('Invalid time frame specified: to-date is in the future');
  }
  if (fromDate.isAfter(now)) {
    return new restify.UnprocessableEntityError('Invalid time frame specified: from-date is in the future');
  }

  if (fromDate.isAfter(toDate)) {
    return new restify.InvalidArgumentError(`Invalid time frame specified: from-date (${fromDate.format()}) is after to-date (${toDate.format()})`);
  }

  if (typeof noTimeLimit !== 'undefined' || noTimeLimit === false) {
    if (Math.abs(toDate.diff(fromDate, 'days')) > 31) {
      return new restify.InvalidArgumentError('Please choose a time frame up to 31 days maximum');
    }
  }
};

const parseAndValidateTimeParams = function (req, res, next) {
  // default to now
  const toDateResult = parseTimeParameter(req, 'to-date', moment().utc());
  if (typeof toDateResult !== 'undefined') {
    return next(toDateResult);
  }

  // default to 2 days earlier
  const fromDateResult = parseTimeParameter(req, 'from-date', req._userParams['to-date'].clone().subtract(2, 'days'));
  if (typeof fromDateResult !== 'undefined') {
    return next(fromDateResult);
  }

  // validate time parameters, no time limit!
  const timesValid = validateTimeParameters(req, true);
  if (typeof timesValid !== 'undefined') {
    return next(timesValid);
  }
  next();
};

const parseAndValidateTimeParamsOptional = function parseAndValidateTimeParamsOptional (req, res, next) {
  // check both parameters are specified. Only one -> Error
  const { param: toDate } = getParam(req, ['to-date']),
    { param: fromDate } = getParam(req, ['from-date']);
  if ((fromDate && !toDate) || (toDate && !fromDate)) {
    return next(new restify.BadRequestError('from-date and to-date need to be specified simultaneously'));
  }

  if (fromDate && toDate) {
    // no default
    const toDateResult = parseTimeParameter(req, 'to-date');
    if (typeof toDateResult !== 'undefined') {
      return next(toDateResult);
    }

    // also no default
    const fromDateResult = parseTimeParameter(req, 'from-date');
    if (typeof fromDateResult !== 'undefined') {
      return next(fromDateResult);
    }

    // validate time parameters
    const timesValid = validateTimeParameters(req);
    if (typeof timesValid !== 'undefined') {
      return next(timesValid);
    }
  }
  next();
};

const parseAndValidateTimeParamsForFindAllBoxes = function parseAndValidateTimeParamsForFindAllBoxes (req, res, next) {
  if (req._userParams.date) {
    const dates = req._userParams.date.split(',');
    // parse and validate
    for (let i = 0, len = dates.length; i < len; i++) {
      dates[i] = utils.parseTimestamp(dates[i]);
      if (!dates[i].isValid()) {
        return next(new restify.UnprocessableEntityError('unable to parse supplied date parameter'));
      }
    }

    if (dates.length === 1) {
      setUserParam(req, 'fromDate', dates[0].clone().subtract(4, 'hours')); // sub 4
      setUserParam(req, 'toDate', dates[0].clone().add(4, 'hours')); // then add 8 to get to the 4 in the future
    } else if (dates.length === 2) {
      const now = moment().utc();
      if (dates[0].isAfter(dates[1])) { // moment().isBefore() will check the date's validities as well
        return next(new restify.InvalidArgumentError(`Invalid time frame specified: first date (${dates[0].format()}) is after second date (${dates[1].format()})`));
      }
      if (dates[0].isAfter(now)) {
        return new restify.UnprocessableEntityError('Invalid time frame specified: first date is in the future');
      }
      if (dates[1].isAfter(now)) {
        return new restify.UnprocessableEntityError('Invalid time frame specified: second date is in the future');
      }

      setUserParam(req, 'fromDate', dates[0]);
      setUserParam(req, 'toDate', dates[1]);
    } else {
      return next(new restify.UnprocessableEntityError('invalid number of dates for date parameter supplied'));
    }
  }

  next();
};

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

module.exports = {
  decodeBase64Image,
  checkContentType,
  validateAuthenticationRequest,
  validateIdParams,
  preRequest,
  validateBboxParam,
  parseAndValidateTimeParams,
  parseAndValidateTimeParamsOptional,
  retrieveParameter,
  retrieveParameters,
  initUserParams,
  parseAndValidateTimeParamsForFindAllBoxes,
  GET_DATA_MULTI_DEFAULT_COLUMNS: ['createdAt', 'value', 'lat', 'lon'],
  GET_DATA_MULTI_ALLOWED_COLUMNS: ['createdAt', 'value', 'lat', 'lon', 'unit', 'boxId', 'sensorId', 'phenomenon', 'sensorType', 'boxName', 'exposure'],
  setHoneybadgerContext,
  addCache,
  clearCache
};
