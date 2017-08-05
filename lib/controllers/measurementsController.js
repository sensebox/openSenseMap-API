'use strict';

const
  restifyErrors = require('restify-errors'),
  { Measurement, Box } = require('../models'),
  csvstringify = require('csv-stringify'),
  streamTransform = require('stream-transform'),
  jsonstringify = require('stringify-stream'),
  decodeHandlers = require('../decoding'),
  { checkContentType } = require('../helpers/apiUtils'),
  {
    retrieveParameters,
    retrieveLocationParameter,
    GET_DATA_MULTI_DEFAULT_COLUMNS,
    GET_DATA_MULTI_ALLOWED_COLUMNS,
    validateBboxParam,
    validateFromToTimeParams
  } = require('../helpers/userParamHelpers'),
  { outlierTransformer } = require('../statistics');

const { BadRequestError, InternalServerError, UnprocessableEntityError, NotFoundError, UnsupportedMediaTypeError } = restifyErrors;

/**
 * @api {get} /boxes/:senseBoxId/sensors Get latest measurements of a senseBox
 * @apiDescription Get the latest measurements of all sensors of the specified senseBox.
 * @apiGroup Measurements
 * @apiName getLatestMeasurements
 * @apiUse BoxIdParam
 */
const getLatestMeasurements = function getLatestMeasurements (req, res, next) {
  Box.findAndPopulateBoxById(req._userParams.boxId, { onlyLastMeasurements: true })
    .then(function (box) {
      if (box) {
        res.send(box);
      } else {
        return next(new NotFoundError('No senseBox found'));
      }
    })
    .catch(function (error) {
      const e = error.errors;

      return next(new InternalServerError(e));
    });
};


const getDataTransformerFunction = function getDataTransformerFunction (data) {
  data.createdAt = data.createdAt.toISOString();

  return data;
};

/**
 * @apiDefine SeparatorParam
 *
 * @apiParam {String=comma,semicolon} [delimiter=comma] Only for csv: the delimiter for csv. Possible values: `semicolon`, `comma`. Per default a comma is used. Alternatively you can use separator as parameter name.
 */

/**
 * @api {get} /boxes/:senseBoxId/data/:sensorId?from-date=fromDate&to-date=toDate&download=true&format=json Get the 10000 latest measurements for a sensor
 * @apiDescription Get up to 10000 measurements from a sensor for a specific time frame, parameters `from-date` and `to-date` are optional. If not set, the last 48 hours are used. The maximum time frame is 1 month. If `download=true` `Content-disposition` headers will be set. Allows for JSON or CSV format.
 * @apiGroup Measurements
 * @apiName getData
 * @apiUse BoxIdParam
 * @apiUse SensorIdParam
 * @apiUse OutlierParameters
 * @apiParam {ISO8601Date} [from-date] Beginning date of measurement data (default: 48 hours ago from now)
 * @apiParam {ISO8601Date} [to-date] End date of measurement data (default: now)
 * @apiParam {String="json","csv"} [format=json] Can be 'json' (default) or 'csv' (default: json)
 * @apiParam {Boolean="true","false"} [download] if specified, the api will set the `content-disposition` header thus forcing browsers to download instead of displaying. Is always true for format csv.
 * @apiUse SeparatorParam
 */
const getData = function getData (req, res, next) {
  let stringifier;

  const { format, delimiter, outliers, outlierWindow } = req._userParams;

  // validate window
  if (outlierWindow < 1 || outlierWindow >= 50) {
    return next(new BadRequestError('parameter outlier-window must be between 1 and 50, default is 15'));
  }

  // IDEA: add geojson point featurecollection format
  if (format === 'csv') {
    res.header('Content-Type', 'text/csv');
    const csvColumns = ['createdAt', 'value'];
    if (outliers) {
      csvColumns.push('isOutlier');
    }

    stringifier = csvstringify({ columns: csvColumns, header: 1, delimiter });
  } else if (format === 'json') {
    res.header('Content-Type', 'application/json; charset=utf-8');
    stringifier = jsonstringify({ open: '[', close: ']' }, function replacer (k, v) {
      // dont send unnecessary nested location
      return (k === 'location') ? v.coordinates : v;
    });
  }

  // offer download to browser
  if (format === 'csv' || (req._userParams.download === 'true')) {
    res.header('Content-Disposition', `attachment; filename=${req.params.sensorId}.${format}`);
  }

  // finally execute the query
  const queryLimit = 10000;

  const qry = {
    sensor_id: req._userParams.sensorId,
    createdAt: {
      $gte: req._userParams.fromDate.toDate(),
      $lte: req._userParams.toDate.toDate()
    }
  };

  const measurementsCursor = Measurement
    .find(qry, { 'createdAt': 1, 'value': 1, 'location': 1, '_id': 0 })
    .cursor({ lean: true, limit: queryLimit });

  if (outliers) {
    measurementsCursor
      .pipe(streamTransform(getDataTransformerFunction))
      .pipe(outlierTransformer({
        window: Math.trunc(outlierWindow), // only allow integer values
        replaceOutlier: (outliers === 'replace')
      }))
      .on('error', function (err) {
        res.end(`Error: ${err.message}`);
      })
      .pipe(stringifier)
      .pipe(res);
  } else {
    measurementsCursor
      .pipe(streamTransform(getDataTransformerFunction))
      .pipe(stringifier)
      .pipe(res);
  }
};

/**
 * @api {get,post} /boxes/data?boxid=:senseBoxIds&from-date=:fromDate&to-date:toDate&phenomenon=:phenomenon Get latest measurements for a phenomenon as CSV
 * @apiDescription Download data of a given phenomenon from multiple selected senseBoxes as CSV
 * @apiGroup Measurements
 * @apiName getDataMulti
 * @apiParam {String} senseBoxIds Comma separated list of senseBox IDs.
 * @apiParam {String} phenomenon the name of the phenomenon you want to download the data for.
 * @apiParam {ISO8601Date} [from-date] Beginning date of measurement data (default: 2 days ago from now)
 * @apiParam {ISO8601Date} [to-date] End date of measurement data (default: now)
 * @apiUse SeparatorParam
 * @apiUse BBoxParam
 * @apiUse ExposureFilterParam
 * @apiParam {String=createdAt,value,lat,lon,height,boxId,boxName,exposure,sensorId,phenomenon,unit,sensorType} [columns=createdAt,value,lat,lon] Comma separated list of columns to export.
 */
const getDataMulti = function getDataMulti (req, res, next) {
  const { boxId, bbox, exposure, delimiter, columns, fromDate, toDate, phenomenon } = req._userParams;

  // build query
  const queryParams = {
    'sensors.title': phenomenon
  };

  if (boxId && bbox) {
    return next(new BadRequestError('please specify only boxId or bbox'));
  } else if (!boxId && !bbox) {
    return next(new BadRequestError('please specify either boxId or bbox'));
  }

  if (boxId) {
    queryParams['_id'] = { '$in': boxId };
  }

  // exposure parameter
  if (req._userParams.exposure) {
    queryParams['exposure'] = exposure;
  }

  Box.findMeasurementsOfBoxesStream({
    query: queryParams,
    bbox,
    from: fromDate.toDate(),
    to: toDate.toDate(),
    columns,
    transformations: { parseAndStringifyValues: true, stringifyTimestamps: true }
  })
    .then(function (cursor) {

      res.header('Content-Type', 'text/csv');
      const stringifier = csvstringify({ columns, delimiter, header: 1 });

      cursor
        .pipe(stringifier)
        .pipe(res);

    })
    .catch(function (err) {
      if (err === 'no senseBoxes found') {
        return next(new NotFoundError(err));
      }

      return next(new InternalServerError(err));
    });
};

/**
 * @api {post} /boxes/:senseBoxId/:sensorId Post new measurement
 * @apiDescription Posts a new measurement to a specific sensor of a box.
 * @apiGroup Measurements
 * @apiName postNewMeasurement
 * @apiUse BoxIdParam
 * @apiUse SensorIdParam
 * @apiUse LocationBody
 * @apiUse ContentTypeJSON
 * @apiParam (RequestBody) {String} value the measured value of the sensor. Also accepts JSON float numbers.
 * @apiParam (RequestBody) {ISO8601Date} [createdAt] the timestamp of the measurement. Should be parseable by JavaScript.
 * @apiParam (RequestBody) {Location} [location] the WGS84-coordinates of the measurement.
 */
const jsonHandler = decodeHandlers.json;
const postNewMeasurement = function postNewMeasurement (req, res, next) {
  const { boxId, sensorId, value, createdAt, location } = req._userParams;

  Promise.all([Box.findById(boxId), jsonHandler.decodeMessage([{
    sensor_id: sensorId,
    value,
    createdAt,
    location
  }])])
    .then(function (results) {
      const [ box, measurements ] = results;
      if (!box) {
        return Promise.reject(next(new NotFoundError('no senseBox found')));
      }

      return box.saveMeasurement(measurements[0]);
    })
    .then(function () {
      res.send(201, 'Measurement saved in box');
    })
    .catch(function (err) {
      let msg;
      if (err) {
        msg = `${err}`;
        if (err.message) {
          msg = `${err.message}. ${msg}`;
        }
      }

      if (!res.finished) {
        return next(new UnprocessableEntityError(msg));
      }

      return next(new InternalServerError(err));
    });
};

/**
 * @api {post} /boxes/:senseBoxId/data Post multiple new measurements
 * @apiDescription Post multiple new measurements in multiple formats to a box. Allows the use of csv, json array and json object notation.
 *
 * **CSV:**<br/>
 * For data in csv format, first use `content-type: text/csv` as header, then submit multiple values as lines in `sensorId,value,[createdAt]` form.
 * Timestamp is optional. Do not submit a header.
 *
 * **JSON Array:**<br/>
 * You can submit your data as array. Your measurements should be objects with the keys `sensor`, `value` and optionally `createdAt` and `location`. Specify the header `content-type: application/json`.
 *
 * **JSON Object:**<br/>
 * The third form is to encode your measurements in an object. Here, the keys of the object are the sensorIds, the values of the object are either just the `value` of your measurement or an array of the form `[value, createdAt, location]`, where the latter two values are optional.
 *
 * **Luftdaten Format**<br/>
 * Decoding of luftdaten.info json format. Activate by specifying `luftdaten=true` in the query string. The API now tries to convert the objects in the `sensordatavalues` key to the openSenseMap JSON Array format. Sensors are matched by the key `value_type` against the `title` of the sensors of this box. `SDS_P1` matches sensors with title `PM10`, `SDS_P2` matches sensors with title `PM2.5`. You can find all matchings in the source code of the openSenseMap-API (`lib/decoding/luftdatenHandler.js`)
 *
 * **senseBox Bytes Format**<br/>
 * Submit measurements as raw bytes. Set the "content-type" header to `application/snsbx-bytes`. Send measurements as 12 byte sensor Id with most significant byte first followed by 4 byte float measurement in little endian (least significant byte first) notation. A valid measurement could look like this:<br />[ 0x59, 0x5f, 0x9a, 0x28, 0x2d, 0xcb, 0xee, 0x77, 0xac, 0x0e, 0x5d, 0xc4, 0x9a, 0x99, 0x89, 0x40 ] but encoded as raw bytes. Multiple measurements are just multiple tuples of id and value. The number of bytes should be a multiple of 16.
 *
 * **senseBox Bytes with Timestamp Format**<br/>
 * Submit measurements with timestamp as raw bytes. Set the "content-type" header to `application/snsbx-bytes-ts`. Send measurements as 12 byte sensor Id with most significant byte first followed by 4 byte float measurement in little endian (least significant byte first) notation followed by a 4 byte uint32_t unix timestamp in little endian (least significant byte first) notation. A valid measurement could look like this:<br />[ 0x59, 0x5f, 0x9a, 0x28, 0x2d, 0xcb, 0xee, 0x77, 0xac, 0x0e, 0x5d, 0xc4, 0x9a, 0x99, 0x89, 0x40, 0x34, 0x0c, 0x60, 0x59 ] but encoded as raw bytes. Multiple measurements are just multiple tuples of id, value and timestamp. The number of bytes should be a multiple of 20.
 *
 * For all encodings, the maximum count of values in one request is 2500.
 *
 * @apiGroup Measurements
 * @apiName postNewMeasurements
 * @apiUse BoxIdParam
 * @apiUse LocationBody
 * @apiParam {String} [luftdaten] Specify whatever you want (like `luftdaten=1`. Signals the api to treat the incoming data as luftdaten.info formatted json.
 * @apiParamExample {application/json} JSON-Object:
 * {
 *   "sensorID": "value",
 *   "anotherSensorID": ["value"]
 *   "sensorID3": ["value", "createdAt as ISO8601-timestamp"],
 *   "sensorID4": ["value", "createdAt as ISO8601-timestamp", "location latlng-object or array"],
 * }
 * @apiParamExample {application/json} JSON-Array:
 * [
 *   {"sensor":"sensorID", "value":"value"},
 *   {"sensor":"anotherSensorId", "value":"value", "createdAt": "ISO8601-timestamp", "location": [lng,lat,height]}
 *   ...
 * ]
 * @apiParamExample {text/csv} CSV:
 * sensorID,value
 * anotherSensorId,value,ISO8601-timestamp
 * sensorIDtheThird,value
 * ...
 * @apiParamExample {application/json} Luftdaten Format:
 * {
 *   "sensordatavalues": [
 *     {
 *       "value_type": "SDS_P1",
 *       "value": "5.38"
 *     },
 *     {
 *       "value_type": "SDS_P2",
 *       "value": "4.98"
 *     }
 *   ]
 * }
 */
const postNewMeasurements = function postNewMeasurements (req, res, next) {
  const { boxId, luftdaten } = req._userParams;
  const handler = decodeHandlers[(
    luftdaten // if
      ? 'luftdaten' // then
      : req.contentType().toLowerCase() // else
  )];
  if (handler) {
    let theBox;
    Box.findById(boxId)
      .then(function (box) {
        if (!box) {
          return Promise.reject(next(new NotFoundError('no senseBox found')));
        }

        theBox = box;

        return handler.decodeMessage(req.body, { sensors: box.sensors }) ;
      })
      .then(function (measurements) {
        // handler.decodeMessage succeeded, so just save measurements
        return theBox.saveMeasurementsArray(measurements);
      })
      .then(function () {
        res.send(201, 'Measurements saved in box');
      })
      .catch(function (err) {
        let msg;
        if (err) {
          msg = `${err}`;
          if (err.message) {
            msg = `${err.message}. ${msg}`;
          }
        }

        if (!res.finished) {
          return next(new UnprocessableEntityError(msg));
        }

        return next(new InternalServerError(err));
      });
  } else {
    return next(new UnsupportedMediaTypeError('Unsupported content-type.'));
  }
};


module.exports = {
  postNewMeasurement: [
    checkContentType,
    retrieveLocationParameter(),
    retrieveParameters([
      { predef: 'boxId', required: true },
      { name: 'sensorId', aliases: ['sensor_id', 'sensor'], dataType: 'id', required: true },
      { name: 'value', required: true },
      { name: 'createdAt', dataType: 'ISO8601' }
    ]),
    postNewMeasurement
  ],
  postNewMeasurements: [
    retrieveParameters([
      { predef: 'boxId', required: true },
      { name: 'luftdaten' }
    ]),
    postNewMeasurements
  ],
  getData: [
    retrieveParameters([
      { name: 'sensorId', aliases: ['sensor_id', 'sensor'], dataType: 'id', required: true },
      { name: 'format', defaultValue: 'json', allowedValues: ['json', 'csv'] },
      { name: 'download', defaultValue: 'false', allowedValues: ['true', 'false'] },
      { name: 'delimiter', aliases: ['separator'], defaultValue: ',', mapping: { 'comma': ',', 'semicolon': ';' } },
      { name: 'outliers', allowedValues: ['mark', 'replace'] },
      { name: 'outlierWindow', dataType: 'Number', aliases: ['outlier-window'], defaultValue: 15 },
      { predef: 'toDate' },
      { predef: 'fromDate' }
    ]),
    validateFromToTimeParams,
    getData
  ],
  getDataMulti: [
    retrieveParameters([
      { predef: 'boxId' },
      { name: 'phenomenon', required: true },
      { name: 'delimiter', aliases: ['separator'], defaultValue: ',', mapping: { 'comma': ',', 'semicolon': ';' } },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES },
      { name: 'columns', dataType: ['String'], defaultValue: GET_DATA_MULTI_DEFAULT_COLUMNS, allowedValues: GET_DATA_MULTI_ALLOWED_COLUMNS },
      { name: 'bbox', dataType: ['Number'] },
      { predef: 'toDate' },
      { predef: 'fromDate' }
    ]),
    validateFromToTimeParams,
    validateBboxParam,
    getDataMulti
  ],
  getLatestMeasurements: [
    retrieveParameters([
      { predef: 'boxId', required: true }
    ]),
    getLatestMeasurements
  ]
};

