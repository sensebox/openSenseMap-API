'use strict';

const { BadRequestError, UnprocessableEntityError, InvalidArgumentError, ForbiddenError } = require('restify-errors'),
  { utils: { parseAndValidateTimestamp }, db: { mongoose }, decoding: { validators: { transformAndValidateCoords } } } = require('@sensebox/opensensemap-api-models'),
  moment = require('moment'),
  isemail = require('isemail'),
  handleModelError = require('./errorHandler'),
  area = require('@turf/area').default,
  config = require('config');

const decodeBase64Image = function (dataString) {
  if (dataString === 'deleteImage: true') {
    return {
      deleteImage: true
    };
  }

  const matches = dataString.match(/^data:(?:image\/(jpeg|png|gif));base64,(.+)$/m);

  if (matches) {
    /* eslint-disable no-unused-vars */
    const [_, type, data] = matches;
    /* eslint-enable no-unused-vars */
    if (type && data) {
      return {
        type: (type === 'jpeg' ? 'jpg' : type),
        data: Buffer.from(data, 'base64')
      };
    }
  }

  return false;
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

const stringParser = function stringParser (s) {
  try {
    return s ? s.toString().trim() : s;
  } catch (err) {
    console.log('toString', err);
  }
};

/**
 * @apiDefine BoxIdParam
 * @apiParam {String} senseBoxId the ID of the senseBox you are referring to.
 */

const idCheck = function idCheck (id) {
  if (mongoose.Types.ObjectId.isValid(id) && id !== '00112233445566778899aabb') {
    return id;
  }

  return false;
};

/**
 * @apiDefine BBoxParam
 *
 * @apiParam {String} bbox A bounding box containing 4 WGS84 coordinates separated by comata (,). Order is: longitude southwest, latitude southwest, longitude northeast, latitude northeast. Minimal and maximal values are: -180, 180 for longitude and -90, 90 for latitude.
 */

const bboxParser = function (bboxStr) {
  const coordsArr = bboxStr.toString()
    .trim()
    .split(',')
    .map(c => parseFloat(c));

  const [lngSW, latSW, lngNE, latNE, ...rest] = coordsArr;

  if (coordsArr.some(isNaN)) {
    return new Error('Supplied values can not be parsed as floats.');
  }

  if (coordsArr.length !== 4 || rest.length !== 0 || coordsArr.some(c => typeof c === 'undefined')) {
    return new Error('Invalid number of coordinates.');
  }

  if (Math.abs(lngSW) > 180 || Math.abs(lngNE) > 180 || Math.abs(latSW) > 90 || Math.abs(latNE) > 90) {
    return new Error('Supplied coordinates are outside of -180, -90, 180, 90 (lngSW, latSW, lngNE, latNE).');
  }

  const polygon = {
    type: 'Polygon',
    coordinates: [[
      [lngSW, latSW],
      [lngNE, latSW],
      [lngNE, latNE],
      [lngSW, latNE],
      [lngSW, latSW]
    ]],
    crs: {
      type: 'name',
      properties: { name: 'urn:x-mongodb:crs:strictwinding:EPSG:4326' }
    }
  };

  if (area(polygon) === 0) {
    return new Error('Supplied bounding box has zero surface area.');
  }

  return polygon;
};

const timestampParser = function timestampParser (timestamp) {
  try {
    return parseAndValidateTimestamp(timestamp);
  } catch (err) {
    return err;
  }
};

const paramParsersAndChecks = {
  'Number': {
    parser: Number.parseFloat,
    check: Number.isNaN
  },
  'RFC 3339': {
    parser: timestampParser,
    check: t => t
  },
  'String': {
    parser: stringParser,
    check: s => s === ''
  },
  'StringWithEmpty': {
    parser: stringParser
  },
  'object': {
    parser: obj => obj,
    check: obj => Boolean(!obj) || typeof obj !== 'object'
  },
  'base64Image': {
    parser: decodeBase64Image,
    check: img => Boolean(!img)
  },
  'email': {
    parser: e => e
      .toString()
      .trim()
      .toLowerCase(),
    check: isemail.validate,
    failOnCheckResultEquals: false
  },
  'id': {
    parser: stringParser,
    check: idCheck,
    failOnCheckResultEquals: false
  },
  'bbox': {
    parser: bboxParser,
    check: poly => poly
  },
  'Integer': {
    parser: Number.parseFloat,
    check: Number.isSafeInteger,
    failOnCheckResultEquals: false
  }
};

const castParam = function castParam (param, paramDataType, dataTypeIsArray) {
  // wrap value in array if neccessary
  if (!Array.isArray(param) && dataTypeIsArray && typeof param.split !== 'undefined') {
    param = param.split(',');
  } else if (!Array.isArray(param)) {
    param = [param];
  }

  if (paramParsersAndChecks[paramDataType]) {
    const { parser, check = () => false, failOnCheckResultEquals = true } = paramParsersAndChecks[paramDataType];

    for (let i = 0, len = param.length; i < len; i++) {
      // also use parser for mapping
      if (!param[i]) {
        console.log('PARAM NOT DEFINED', param, i);
      }
      param[i] = parser(param[i]);
      const checkResult = check(param[i]);
      if (typeof checkResult === 'boolean' && checkResult === failOnCheckResultEquals) {
        return;
      } else if (checkResult instanceof Error) {
        return checkResult;
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

const extractParam = function extractParam ({ req: { params, rawBody, body, _body, query }, name, aliases }) {
  // create a searchSpace for the parameter
  // restify uses different properties of req for parameter depending
  // on the content-type for storing query, body, parameters etc
  // The order in Object.assign defines which property ends up in the final object.
  // (significance: last to first)
  const searchSpace = Object.assign({}, _body, rawBody, body, query, params);
  // try to retrieve parameter by name
  let value = searchSpace[name];
  let nameUsed = name;
  // if there was no value and aliases are defined
  if (typeof value === 'undefined' && aliases) {
    // iterate over aliases and try to find the parameter
    for (const alias of aliases) {
      if (alias in searchSpace) {
        value = searchSpace[alias];
        nameUsed = `${name} (${alias})`;
        break;
      }
    }
  }

  return { value, nameUsed };
};

const validateMinMaxParam = function validateMinMaxParam (valueArr, min, max) {
  if (!Array.isArray(valueArr)) {
    return valueArr;
  }

  for (const value of valueArr) {
    const tooLow = (min && value < min),
      tooHigh = (max && value > max);

    const errStr = `Supplied value ${value} is outside of allowed range`;
    if (tooLow === true && tooHigh === true) {
      return new Error(`${errStr} (${min}, ${max})`);
    }

    if (tooLow === true) {
      return new Error(`${errStr} (< ${min})`);
    }

    if (tooHigh === true) {
      return new Error(`${errStr} (> ${max})`);
    }
  }

  return valueArr;
};

const ARRAY_NOT_ALLOWED = 1,
  CAST_FAILED = 2,
  ILLEGAL_VALUE = 3,
  ERROR_CUSTOM_MESSAGE = 4;

const validateAndCastParam = function validateAndCastParam ({ value, dataType, allowedValues, mapping, dataTypeIsArray, min, max }) {
  // wrap dataType in array for calling of casting function
  dataType = (dataTypeIsArray ? dataType[0] : dataType);
  if (!dataTypeIsArray && Array.isArray(value)) {
    return { error: ARRAY_NOT_ALLOWED };
  }

  // test and cast value against dataType
  let castedValue = castParam(value, dataType, dataTypeIsArray);

  if (typeof castedValue === 'undefined') {
    return { error: CAST_FAILED };
  }

  castedValue = validateMinMaxParam(castedValue, min, max);

  if (castedValue instanceof Error) {
    return { error: ERROR_CUSTOM_MESSAGE, message: castedValue.message };
  }

  // no allowedValues or no mapping === allow everything
  if (dataType[0] === 'object' || (typeof allowedValues === 'undefined' && typeof mapping === 'undefined')) {
    return { castedValue };
  }

  // check for mapping first, allowedValues will be ignored if mapping is set
  if (typeof mapping !== 'undefined') {
    // return error if not allowed
    if (!checkParamAllowed(castedValue, Object.keys(mapping))) {
      return { error: ILLEGAL_VALUE };
    }

    // return mapped values
    return { castedValue: castedValue.map(v => mapping[v]) };
  }

  // there was no mapping, check against allowedValues
  if (typeof allowedValues !== 'undefined' && checkParamAllowed(castedValue, allowedValues)) {
    return { castedValue };
  }

  return { error: ILLEGAL_VALUE };
};

/**
 * @apiDefine LocationOption Formats accepted for the location field
 */

/**
 * @apiDefine LocationBody
 * Either a JSON array of [longitude, latitude, height], or a JSON object of the following format must be provided.
 * The height field is optional and in reference to ground level. The reference system for lat & lng is WGS 84 (EPSG:4326).
 *
 * @apiParam (LocationOption) {Number} lat Latitude between -90 and 90
 * @apiParam (LocationOption) {Number} lng Longitude between -180 and 180
 * @apiParam (LocationOption) {Number} [height] Height above ground in meters.
 *
 * @apiParamExample {application/json} Location Object:
 * { "lat": 51.972, "lng": 7.684, "height": 66.6 }
 *
 * @apiParamExample {application/json} Location Array:
 * [7.684, 51.972, 66.6]
 */

// we need a custom function for locations, because arrays and objects are accepted,
// which currently cannot be accomplished with retrieveParameters()
const retrieveLocationParameter = function ({ value }) {
  try {
    return { castedValue: transformAndValidateCoords(value) };
  } catch (err) {
    return { error: ERROR_CUSTOM_MESSAGE, message: err.message };
  }
};

const
  GET_DATA_MULTI_DEFAULT_COLUMNS = ['sensorId', 'createdAt', 'value', 'lat', 'lon'],
  GET_DATA_MULTI_ALLOWED_COLUMNS = ['createdAt', 'value', 'lat', 'lon', 'height', 'unit', 'boxId', 'sensorId', 'phenomenon', 'sensorType', 'boxName', 'exposure'];

// functions which receive req._userparams as parameter
const retrieveParametersPredefs = {
  'fromDate' ({ toDate }) {
    if (!toDate) {
      return {};
    }

    return { name: 'fromDate', dataType: 'RFC 3339', defaultValue: toDate.clone().subtract(2, 'days'), aliases: ['from-date'] };
  },
  'toDate' () {
    return { name: 'toDate', dataType: 'RFC 3339', defaultValue: moment.utc(), aliases: ['to-date'] };
  },
  'fromDateNoDefault' () {
    return { name: 'fromDate', dataType: 'RFC 3339', aliases: ['from-date'] };
  },
  'toDateNoDefault' () {
    return { name: 'toDate', dataType: 'RFC 3339', aliases: ['to-date'] };
  },
  'boxId' () {
    return { name: 'boxId', aliases: ['senseboxid', 'senseboxids', 'boxid', 'boxids'], dataType: 'id' };
  },
  'sensorId' () {
    return { name: 'sensorId', aliases: ['sensor_id', 'sensor'], dataType: 'id' };
  },
  'delimiter' () {
    return { name: 'delimiter', aliases: ['separator'], defaultValue: ',', mapping: { 'comma': ',', 'semicolon': ';' } };
  },
  'columnsGetDataMulti' () {
    return { name: 'columns', dataType: ['String'], defaultValue: GET_DATA_MULTI_DEFAULT_COLUMNS, allowedValues: GET_DATA_MULTI_ALLOWED_COLUMNS };
  },
  'bbox' () {
    return { name: 'bbox', dataType: 'bbox' };
  },
  'location' () {
    return { name: 'location', dataType: ['location'], paramValidatorAndParser: retrieveLocationParameter }; // dataType array ['location'] is needed for setting the userparam correctly
  },
  'password' () {
    return { name: 'password', required: true, dataType: 'as-is' };
  }
};

const handleAndSetParameterRequest = function handleAndSetParameterRequest (req, next, { name, aliases, dataType = 'String', allowedValues, mapping, required = false, defaultValue, min, max, paramValidatorAndParser = validateAndCastParam }) {
  // extract param from request
  const { value, nameUsed } = extractParam({ req, name, aliases });
  // there was no user supplied value but a default value
  if (typeof value === 'undefined' && typeof defaultValue !== 'undefined') {
    setUserParam(req, name, defaultValue);

    return;
  } else if (typeof value === 'undefined' && required === true) {
    // no user supplied value and required -> error
    return next(new BadRequestError(`missing required parameter ${name}`));
  } else if (typeof value === 'undefined' && required === false) {
    // no value and not required, skip to the next parameter
    return;
  }

  const dataTypeIsArray = Array.isArray(dataType);
  // at this point we can assume the parameter was set
  // validate
  const { castedValue, error, message } = paramValidatorAndParser({ value, dataType, allowedValues, mapping, dataTypeIsArray, min, max });
  switch (error) {
  case ARRAY_NOT_ALLOWED:
    return next(new BadRequestError(`Parameter ${nameUsed} must only be specified once`));
  case CAST_FAILED:
    /* eslint-disable prefer-template */
    return next(new UnprocessableEntityError(`Parameter ${nameUsed} is not parseable as datatype ${(dataTypeIsArray ? 'array of ' + dataType[0] : dataType)}`));
    /* eslint-enable prefer-template */
  case ILLEGAL_VALUE:
    return next(new UnprocessableEntityError(`Illegal value for parameter ${nameUsed}. allowed values: ${allowedValues.join(', ')}`));
  case ERROR_CUSTOM_MESSAGE:
    return next(new UnprocessableEntityError(`Illegal value for parameter ${nameUsed}. ${message}`));
  }

  // no error matched
  setUserParam(req, name, (dataTypeIsArray ? castedValue : castedValue[0]));
};

// A single parameter has the following properties:
// name: String
// aliases: String[]
// dataType: ['String', ['String'], 'StringWithEmpty', ['StringWithEmpty'], 'Number', ['Number'] 'object', ['object'], 'RFC 3339', ['RFC 3339'], 'as-is', 'Integer', ['Integer']] // default: String 'as-is' disables casting and lets restify cast the value
// allowedValues: String[]
// mapping: Object
// required: Boolean // default: false
// defaultValue: Anything
// predef: load definition from elsewhere
// min: minimal value for Numbers and Integers. Compared with >=
// max: maximal value for Numbers and Integers. Compared with <
const retrieveParameters = function retrieveParameters (parameters = []) {
  return function (req, res, next) {
    //for (let { name, aliases, dataType, allowedValues, mapping, required, defaultValue, predef } of parameters) {
    for (const parameter of parameters) {
      // predef has precedence over all other keys
      // it loads from predefined
      if (parameter.predef && Object.getOwnPropertyNames(retrieveParametersPredefs).includes(parameter.predef)) {
        const parameterPredef = retrieveParametersPredefs[parameter.predef](req._userParams);
        // all of the properties are overwritable..
        // overwrite what has been given
        Object.assign(parameterPredef, parameter);

        // handle paramter request
        handleAndSetParameterRequest(req, next, parameterPredef);
        continue;
      }

      if (parameter.name) {
        handleAndSetParameterRequest(req, next, parameter);
      }
    }

    return next();
  };
};

const fromToTimeParamsSanityCheck = function fromToTimeParamsSanityCheck (fromDate, toDate) {
  if ((fromDate && !toDate) || (toDate && !fromDate)) {
    return new BadRequestError('fromDate and toDate need to be specified simultaneously');
  }

  if (fromDate && toDate) {
    if (fromDate.isAfter(toDate)) {
      return new InvalidArgumentError(`Invalid time frame specified: fromDate (${fromDate.toISOString()}) is after toDate (${toDate.toISOString()})`);
    }
  }
};

const validateFromToTimeParams = function validateFromToTimeParams (req, res, next) {
  next(fromToTimeParamsSanityCheck(req._userParams.fromDate, req._userParams.toDate));
};

const parseAndValidateTimeParamsForFindAllBoxes = function parseAndValidateTimeParamsForFindAllBoxes (req, res, next) {
  if (req._userParams.date) {
    const [fromDate, toDate, ...rest] = req._userParams.date;

    if (rest.length !== 0) {
      return next(new UnprocessableEntityError('invalid number of dates for date parameter supplied'));
    } else if (!toDate) {
      setUserParam(req, 'fromDate', fromDate.clone().subtract(4, 'hours')); // sub 4
      setUserParam(req, 'toDate', fromDate.clone().add(4, 'hours')); // then add 4 to get into the future
    } else {
      const timesSane = fromToTimeParamsSanityCheck(fromDate, toDate);
      if (typeof timesSane !== 'undefined') {
        return next(timesSane);
      }

      setUserParam(req, 'fromDate', fromDate);
      setUserParam(req, 'toDate', toDate);
    }
  }

  next();
};

const checkPrivilege = function checkPrivilege (req, res, next) {
  if (req.user && req.user.role === config.get('management_role')) {
    return next();
  }

  if (req._userParams.boxId) {
    try {
      req.user.checkBoxOwner(req._userParams.boxId);

      return next();
    } catch (err) {
      return handleModelError(err, next);
    }
  }

  return next(new ForbiddenError('Not signed in or not authorized to access.'));
};

module.exports = {
  validateFromToTimeParams,
  retrieveParameters,
  initUserParams,
  parseAndValidateTimeParamsForFindAllBoxes,
  checkPrivilege
};
