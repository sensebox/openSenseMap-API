'use strict';

const
  restifyErrors = require('restify-errors'),
  { Measurement, Box } = require('../models'),
  csvstringify = require('csv-stringify'),
  { checkContentType } = require('../helpers/apiUtils'),
  {
    retrieveParameters,
    validateFromToTimeParams
  } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler');

const { BadRequestError, UnsupportedMediaTypeError } = restifyErrors;

/**
 * @api {get} /boxes/:senseBoxId/sensors Get latest measurements of a senseBox
 * @apiDescription Get the latest measurements of all sensors of the specified senseBox.
 * @apiGroup Measurements
 * @apiName getLatestMeasurements
 * @apiUse BoxIdParam
 */
const getLatestMeasurements = function getLatestMeasurements (req, res, next) {
  Box.findBoxById(req._userParams.boxId, { onlyLastMeasurements: true })
    .then(function (box) {
      res.send(box);
    })
    .catch(function (err) {
      handleError(err, next);
    });
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
 * @apiParam {RFC3339Date} [from-date] Beginning date of measurement data (default: 48 hours ago from now)
 * @apiParam {RFC3339Date} [to-date] End date of measurement data (default: now)
 * @apiParam {String="json","csv"} [format=json] Can be 'json' (default) or 'csv' (default: json)
 * @apiParam {Boolean="true","false"} [download] if specified, the api will set the `content-disposition` header thus forcing browsers to download instead of displaying. Is always true for format csv.
 * @apiUse SeparatorParam
 */
const getData = function getData (req, res, next) {
  const { sensorId, format, download } = req._userParams;

  // IDEA: add geojson point featurecollection format
  if (format === 'csv' || (download === 'true')) {
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename=${sensorId}.${format}`);
  } else if (format === 'json') {
    res.header('Content-Type', 'application/json; charset=utf-8');
  }

  Measurement.getMeasurementsStream(req._userParams)
    .on('error', function (err) {
      res.end(`Error: ${err.message}`);

      return next(err);
    })
    .pipe(res);
};

/**
 * @api {get,post} /boxes/data?boxId=:senseBoxIds&from-date=:fromDate&to-date:toDate&phenomenon=:phenomenon Get latest measurements for a phenomenon as CSV
 * @apiDescription Download data of a given phenomenon from multiple selected senseBoxes as CSV
 * @apiGroup Measurements
 * @apiName getDataMulti
 * @apiParam {String} boxId Comma separated list of senseBox IDs.
 * @apiParam {String} phenomenon the name of the phenomenon you want to download the data for.
 * @apiParam {RFC3339Date} [from-date] Beginning date of measurement data (default: 2 days ago from now)
 * @apiParam {RFC3339Date} [to-date] End date of measurement data (default: now)
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
    transformations: { stringifyTimestamps: true }
  })
    .then(function (cursor) {

      res.header('Content-Type', 'text/csv');
      const stringifier = csvstringify({ columns, delimiter, header: 1 });

      cursor
        .pipe(stringifier)
        .pipe(res);

    })
    .catch(function (err) {
      handleError(err, next);
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
 * @apiParam (RequestBody) {RFC3339Date} [createdAt] the timestamp of the measurement. Should conform to RFC 3339.
 * @apiParam (RequestBody) {Location} [location] the WGS84-coordinates of the measurement.
 */
const postNewMeasurement = function postNewMeasurement (req, res, next) {
  const { boxId, sensorId, value, createdAt, location } = req._userParams;

  Box.findBoxById(boxId, { populate: false, lean: false })
    .then(function (box) {
      return Measurement.decodeMeasurements([{
        sensor_id: sensorId,
        value,
        createdAt,
        location
      }], { contentType: 'json' })
        .then(function ([ measurement ]) {
          return box.saveMeasurement(measurement);
        });
    })
    .then(function () {
      res.send(201, 'Measurement saved in box');
    })
    .catch(function (err) {
      handleError(err, next);
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
 *   "sensorID3": ["value", "createdAt as RFC 3339-timestamp"],
 *   "sensorID4": ["value", "createdAt as RFC 3339-timestamp", "location latlng-object or array"],
 * }
 * @apiParamExample {application/json} JSON-Array:
 * [
 *   {"sensor":"sensorID", "value":"value"},
 *   {"sensor":"anotherSensorId", "value":"value", "createdAt": "RFC 3339-timestamp", "location": [lng,lat,height]}
 *   ...
 * ]
 * @apiParamExample {text/csv} CSV:
 * sensorID,value
 * anotherSensorId,value,RFC 3339-timestamp
 * sensorIDtheThird,value
 * anotherSensorId,value,RFC 3339-timestamp,longitude,latitude
 * anotherSensorId,value,RFC 3339-timestamp,longitude,latitude,height
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
  const contentType = (
    luftdaten // if
      ? 'luftdaten' // then
      : req.contentType().toLowerCase() // else
  );
  if (Measurement.hasDecoder(contentType)) {
    Box.findBoxById(boxId, { populate: false, lean: false })
      .then(function (box) {
        return Measurement.decodeMeasurements(req.body, { contentType, sensors: box.sensors })
          .then(function (measurements) {
            // handler.decodeMessage succeeded, so just save measurements
            return box.saveMeasurementsArray(measurements);
          });
      })
      .then(function () {
        res.send(201, 'Measurements saved in box');
      })
      .catch(function (err) {
        handleError(err, next);
      });
  } else {
    return next(new UnsupportedMediaTypeError('Unsupported content-type.'));
  }
};


module.exports = {
  postNewMeasurement: [
    checkContentType,
    retrieveParameters([
      { predef: 'boxId', required: true },
      { predef: 'sensorId', required: true },
      { name: 'value', required: true },
      { name: 'createdAt', dataType: 'RFC 3339' },
      { predef: 'location' }
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
      { predef: 'sensorId', required: true },
      { name: 'format', defaultValue: 'json', allowedValues: ['json', 'csv'] },
      { name: 'download', defaultValue: 'false', allowedValues: ['true', 'false'] },
      { predef: 'delimiter' },
      { name: 'outliers', allowedValues: ['mark', 'replace'] },
      { name: 'outlierWindow', dataType: 'Integer', aliases: ['outlier-window'], defaultValue: 15, min: 1, max: 50 },
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
      { predef: 'delimiter' },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES },
      { predef: 'columnsGetDataMulti' },
      { predef: 'bbox' },
      { predef: 'toDate' },
      { predef: 'fromDate' }
    ]),
    validateFromToTimeParams,
    getDataMulti
  ],
  getLatestMeasurements: [
    retrieveParameters([
      { predef: 'boxId', required: true }
    ]),
    getLatestMeasurements
  ]
};

