'use strict';

const {
    BadRequestError,
    UnsupportedMediaTypeError,
  } = require('restify-errors'),
  { Measurement, Box } = require('@sensebox/opensensemap-api-models'),
  {
    checkContentType,
    createDownloadFilename,
    csvStringifier,
  } = require('../helpers/apiUtils'),
  {
    retrieveParameters,
    validateFromToTimeParams,
  } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler'),
  OutlierTransformer = require('../transformers/outlierTransformer'),
  jsonstringify = require('stringify-stream'),
  { UnauthorizedError, NotFoundError } = require('restify-errors');

/**
 * @api {get} /boxes/:senseBoxId/sensors Get latest measurements of a senseBox
 * @apiDescription Get the latest measurements of all sensors of the specified senseBox.
 * @apiGroup Measurements
 * @apiName getLatestMeasurements
 * @apiUse BoxIdParam
 * @apiParam {NumberNumber=1-100} [count] Number of measurements to be retrieved for every sensor.
 */
/**
 * @api {get} /boxes/:senseBoxId/sensors/:sensorId Get latest measurements of a sensor
 * @apiDescription Get the latest measurements of a sensor.
 * @apiGroup Measurements
 * @apiName getLatestMeasurementOfSensor
 * @apiUse BoxIdParam
 * @apiUse SensorIdParam
 * @apiParam {Boolean="true","false"} [onlyValue] If set to true only returns the measured value without information about the sensor. Requires a sensorId.
 */
const getLatestMeasurements = async function getLatestMeasurements (req, res) {
  const { _userParams: params } = req;

  let box;

  try {
    if (req._userParams.count) {
      box = await Box.findBoxById(req._userParams.boxId, {
        populate: false,
        onlyLastMeasurements: false,
        count: req._userParams.count,
        projection: {
          name: 1,
          lastMeasurementAt: 1,
          sensors: 1,
          grouptag: 1
        }
      });

      const measurements = await Measurement.findLatestMeasurementsForSensorsWithCount(box, req._userParams.count);
      for (let index = 0; index < box.sensors.length; index++) {
        const sensor = box.sensors[index];
        const values = measurements.find(elem => elem._id.equals(sensor._id));
        sensor['lastMeasurements'] = values;
      }
    } else {
      box = await Box.findBoxById(req._userParams.boxId, {
        onlyLastMeasurements: true
      });
    }
  } catch (err) {
    return handleError(err);
  }

  if (params.sensorId) {
    const sensor = box.sensors.find(s => s._id.equals(params.sensorId));
    if (sensor) {
      if (params.onlyValue) {
        if (!sensor.lastMeasurement) {
          res.send(undefined);

          return;
        }
        res.send(sensor.lastMeasurement.value);

        return;
      }
      res.send(sensor);

      return;
    }

    res.send(new NotFoundError(`Sensor with id ${params.sensorId} does not exist`));
  } else {
    res.send(box);
  }
};

/**
 * @apiDefine SeparatorParam
 *
 * @apiParam {String=comma,semicolon} [delimiter=comma] Only for csv: the delimiter for csv. Possible values: `semicolon`, `comma`. Per default a comma is used. Alternatively you can use separator as parameter name.
 */

/**
 * @apiDefine OutlierParameters
 *
 * @apiParam {String="replace","mark"} [outliers] Specifying this parameter enables outlier calculation which adds a new field called `isOutlier` to the data. Possible values are "mark" and "replace".
 * @apiParam {Number=1-50} [outlier-window=15] Size of moving window used as base to calculate the outliers.
 */

const jsonLocationReplacer = function jsonLocationReplacer (k, v) {
  // dont send unnecessary nested location
  return (k === 'location') ? v.coordinates : v;
};

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
const getData = async function getData (req, res) {
  const { sensorId, format, download, outliers, outlierWindow, delimiter } = req._userParams;
  let stringifier;

  // IDEA: add geojson point featurecollection format
  if (format === 'csv') {
    res.header('Content-Type', 'text/csv');
    stringifier = csvStringifier(['createdAt', 'value'], delimiter);
  } else if (format === 'json') {
    res.header('Content-Type', 'application/json; charset=utf-8');
    // IDEA: add geojson point featurecollection format
    stringifier = jsonstringify({ open: '[', close: ']' }, jsonLocationReplacer);
  }
  if (download === 'true') {
    res.header('Content-Disposition', `attachment; filename=${sensorId}.${format}`);
  }

  let measurementsStream = Measurement.getMeasurementsStream(req._userParams)
    .on('error', function (err) {
      return handleError(err);
    });

  if (outliers) {
    measurementsStream = measurementsStream
      .pipe(new OutlierTransformer({
        window: Math.trunc(outlierWindow), // only allow integer values
        replaceOutlier: (outliers === 'replace')
      }));
  }

  // A last time flush headers :)
  res.flushHeaders();

  measurementsStream
    .pipe(stringifier)
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
 * @apiParam {String="csv","json"} [format=csv] Can be 'csv' (default) or 'json' (default: csv)
 * @apiParam {String=createdAt,value,lat,lon,height,boxId,boxName,exposure,sensorId,phenomenon,unit,sensorType} [columns=sensorId,createdAt,value,lat,lon] Comma separated list of columns to export.
 * @apiParam {Boolean=true,false} [download=true] Set the `content-disposition` header to force browsers to download instead of displaying.
 */
const getDataMulti = async function getDataMulti (req, res) {
  const { boxId, bbox, exposure, delimiter, columns, fromDate, toDate, phenomenon, download, format } = req._userParams;

  // build query
  const queryParams = {
    'sensors.title': phenomenon
  };

  if (boxId && bbox) {
    return Promise.reject(new BadRequestError('please specify only boxId or bbox'));
  } else if (!boxId && !bbox) {
    return Promise.reject(new BadRequestError('please specify either boxId or bbox'));
  }

  if (boxId) {
    queryParams['_id'] = { '$in': boxId };
  }

  // exposure parameter
  if (exposure) {
    queryParams['exposure'] = { '$in': exposure };
  }

  try {
    let stream = await Box.findMeasurementsOfBoxesStream({
      query: queryParams,
      bbox,
      from: fromDate.toDate(),
      to: toDate.toDate(),
      columns
    });
    stream = stream
      .on('error', function (err) {
        return handleError(err);
      });

    switch (format) {
    case 'csv':
      res.header('Content-Type', 'text/csv');
      stream = stream.pipe(csvStringifier(columns, delimiter));
      break;
    case 'json':
      res.header('Content-Type', 'application/json');
      // stringifier = jsonstringify({ open: '[', close: ']' });
      stream = stream.pipe(jsonstringify({ open: '[', close: ']' }));
      break;
    }

    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename=${createDownloadFilename(req.date(), 'download', [phenomenon, ...columns], format)}`);
    }

    // flushHeaders is fixing csv-stringify
    res.flushHeaders();

    stream
      .pipe(res);
  } catch (err) {
    return handleError(err);
  }
};


/**
 * @api {get} /boxes/data/bytag Get latest measurements for a grouptag as JSON
 * @apiDescription Download data of a given grouptag from multiple senseBoxes as JSON
 * @apiDeprecated Will change in the upcoming release to /boxes/data?grouptag=:grouptag
 * @apiGroup Measurements
 * @apiName getDataByGroupTag
 * @apiParam {String} grouptag The grouptag to search by.
 * @apiParam {String=json} format=json
 */
const getDataByGroupTag = async function getDataByGroupTag (req, res) {
  const { grouptag, format } = req._userParams;
  const queryTags = grouptag.split(',');
  // build query
  const queryParams = {};
  if (grouptag) {
    queryParams['grouptag'] = { '$all': queryTags };
  }

  try {
    let stream = await Box.findMeasurementsOfBoxesByTagStream({
      query: queryParams
    });
    stream = stream
      .on('error', function (err) {
        return handleError(err);
      });
    switch (format) {
    case 'json':
      res.header('Content-Type', 'application/json');
      stream = stream
        .pipe(jsonstringify({ open: '[', close: ']' }));
      break;
    }

    stream
      .pipe(res);
  } catch (err) {
    return handleError(err);
  }
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
 * @apiParam (RequestBody) {RFC3339Date} [createdAt] the timestamp of the measurement. Should conform to RFC 3339. Is needed when posting with Location Values!
 * @apiParam (RequestBody) {Location} [location] the WGS84-coordinates of the measurement.
 * @apiHeader {String} Authorization Box' unique access_token. Will be used as authorization token if box has auth enabled (e.g. useAuth: true)
 */
const postNewMeasurement = async function postNewMeasurement (req, res) {
  const { boxId, sensorId, value, createdAt, location } = req._userParams;

  try {
    const box = await Box.findBoxById(boxId, { populate: false, lean: false });
    if (box.useAuth && box.access_token && box.access_token !== req.headers.authorization) {
      return Promise.reject(new UnauthorizedError('Box access token not valid!'));
    }

    const [measurement] = await Measurement.decodeMeasurements([{
      sensor_id: sensorId,
      value,
      createdAt,
      location
    }]);
    await box.saveMeasurement(measurement);
    res.send(201, 'Measurement saved in box');
  } catch (err) {
    return handleError(err);
  }
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
 * You can submit your data as array. Your measurements should be objects with the keys `sensor`, `value` and optionally `createdAt` and `location`. Specify the header `content-type: application/json`. If Location Values are posted, the Timestamp becomes obligatory.
 *
 * **JSON Object:**<br/>
 * The third form is to encode your measurements in an object. Here, the keys of the object are the sensorIds, the values of the object are either just the `value` of your measurement or an array of the form `[value, createdAt, location]`, where the latter two values are optional.
 *
 * **Luftdaten Format**<br/>
 * Decoding of luftdaten.info json format. Activate by specifying `luftdaten=true` in the query string. The API now tries to convert the objects in the `sensordatavalues` key to the openSenseMap JSON Array format. Sensors are matched by the key `value_type` against the `title` of the sensors of this box. `SDS_P1` matches sensors with title `PM10`, `SDS_P2` matches sensors with title `PM2.5`. You can find all matchings in the source code of the openSenseMap-API (`lib/decoding/luftdatenHandler.js`)
 *
 * **hackAIR Format**<br/>
 * Decoding of hackAIR json format. Activate by specifying `hackair=true` in the query string. The API now tries to convert the values in the `reading` key to the openSenseMap JSON Array format. Sensors are matched by the key `sensor_description` against the `title` of the sensors of this box. `PM2.5_AirPollutantValue` matches sensors with title `PM2.5`, `PM10_AirPollutantValue` matches sensors with title `PM10`. You can find all matchings in the source code of the openSenseMap-API (`lib/decoding/hackAirHandler.js`)
 *
 * **senseBox Bytes Format**<br/>
 * Submit measurements as raw bytes. Set the "content-type" header to `application/sbx-bytes`. Send measurements as 12 byte sensor Id with most significant byte first followed by 4 byte float measurement in little endian (least significant byte first) notation. A valid measurement could look like this:<br />[ 0x59, 0x5f, 0x9a, 0x28, 0x2d, 0xcb, 0xee, 0x77, 0xac, 0x0e, 0x5d, 0xc4, 0x9a, 0x99, 0x89, 0x40 ] but encoded as raw bytes. Multiple measurements are just multiple tuples of id and value. The number of bytes should be a multiple of 16.
 *
 * **senseBox Bytes with Timestamp Format**<br/>
 * Submit measurements with timestamp as raw bytes. Set the "content-type" header to `application/sbx-bytes-ts`. Send measurements as 12 byte sensor Id with most significant byte first followed by 4 byte float measurement in little endian (least significant byte first) notation followed by a 4 byte uint32_t unix timestamp in little endian (least significant byte first) notation. A valid measurement could look like this:<br />[ 0x59, 0x5f, 0x9a, 0x28, 0x2d, 0xcb, 0xee, 0x77, 0xac, 0x0e, 0x5d, 0xc4, 0x9a, 0x99, 0x89, 0x40, 0x34, 0x0c, 0x60, 0x59 ] but encoded as raw bytes. Multiple measurements are just multiple tuples of id, value and timestamp. The number of bytes should be a multiple of 20.
 *
 * For all encodings, the maximum count of values in one request is 2500.
 *
 * @apiGroup Measurements
 * @apiName postNewMeasurements
 * @apiUse BoxIdParam
 * @apiUse LocationBody
 * @apiParam {String} [luftdaten] Specify whatever you want (like `luftdaten=1`. Signals the api to treat the incoming data as luftdaten.info formatted json.
 * * @apiParam {String} [hackair] Specify whatever you want (like `hackair=1`. Signals the api to treat the incoming data as hackair formatted json.
 * @apiHeader {String} Authorization Box' unique access_token. Will be used as authorization token if box has auth enabled (e.g. useAuth: true)
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
 * @apiParamExample {application/json} hackAIR Format:
 * {
 *   "reading": {
 *     "PM2.5_AirPollutantValue": "7.93",
 *     "PM10_AirPollutantValue": "32.63"
 *    },
 *    "battery": "5.99",
 *    "tamper": "0",
 *    "error": "4"
 * }
 */
const postNewMeasurements = async function postNewMeasurements (req, res) {
  const { boxId, luftdaten, hackair } = req._userParams;
  let contentType = req.getContentType();

  if (hackair) {
    contentType = 'hackair';
  } else if (luftdaten) {
    contentType = 'luftdaten';
  }

  if (Measurement.hasDecoder(contentType)) {
    try {
      const box = await Box.findBoxById(boxId, { populate: false, lean: false, projection: { sensors: 1, locations: 1, lastMeasurementAt: 1, currentLocation: 1, model: 1, access_token: 1, useAuth: 1 } });

      // if (contentType === 'hackair' && box.access_token !== req.headers.authorization) {
      //   throw new UnauthorizedError('Box access token not valid!');
      // }

      // authorization for all boxes that have not opt out
      if ((box.useAuth || contentType === 'hackair') && box.access_token && box.access_token !== req.headers.authorization) {
        return Promise.reject(new UnauthorizedError('Box access token not valid!'));
      }

      const measurements = await Measurement.decodeMeasurements(req.body, { contentType, sensors: box.sensors });
      await box.saveMeasurementsArray(measurements);
      res.send(201, 'Measurements saved in box');
    } catch (err) {
      return handleError(err);
    }
  } else {
    return Promise.reject(new UnsupportedMediaTypeError('Unsupported content-type.'));
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
      { name: 'luftdaten' },
      { name: 'hackair' }
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
      { name: 'boxId', aliases: ['senseboxid', 'senseboxids', 'boxid', 'boxids'], dataType: ['id'] },
      { name: 'phenomenon', required: true },
      { predef: 'delimiter' },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES, dataType: ['String'] },
      { predef: 'columnsGetDataMulti' },
      { predef: 'bbox' },
      { predef: 'toDate' },
      { predef: 'fromDate' },
      { name: 'download', defaultValue: 'true', allowedValues: ['true', 'false'] },
      { name: 'format', defaultValue: 'csv', allowedValues: ['csv', 'json'] }
    ]),
    validateFromToTimeParams,
    getDataMulti
  ],
  getDataByGroupTag: [
    retrieveParameters([
      { name: 'grouptag', required: true },
      { name: 'format', defaultValue: 'json', allowedValues: ['json'] }
    ]),
    getDataByGroupTag
  ],
  getLatestMeasurements: [
    retrieveParameters([
      { predef: 'boxId', required: true },
      { predef: 'sensorId' },
      { name: 'count', dataType: 'Integer', min: 1, max: 100, required: false },
      { name: 'onlyValue', required: false }
    ]),
    getLatestMeasurements
  ]
};
