'use strict';

const restify = require('restify'),
  { Measurement, Box } = require('../models'),
  csvstringify = require('csv-stringify'),
  streamTransform = require('stream-transform'),
  jsonstringify = require('stringify-stream'),
  { Honeybadger } = require('../utils'),
  decodeHandlers = require('../decoding'),
  {
    retrieveParameter,
    retrieveParameters,
    retrieveLocationParameter,
    clearCache,
    addCache,
    parseAndValidateTimeParamsForFindAllBoxes,
    checkContentType,
    parseAndValidateTimeParams,
    GET_DATA_MULTI_DEFAULT_COLUMNS,
    GET_DATA_MULTI_ALLOWED_COLUMNS,
    validateBboxParam
  } = require('../requestUtils'),
  { point, featureCollection } = require('@turf/helpers'),
  turfConvex = require('@turf/convex'),
  turfSimplify = require('@turf/simplify'),
  { outlierTransformer } = require('../statistics'),
  log = require('../log');

/**
 * @api {put} /boxes/:senseBoxId Update a senseBox
 * @apiDescription Modify the specified senseBox.
 *
 * @apiUse SensorBody
 * @apiUse LocationBody
 * @apiUse MqttBody
 * @apiUse TTNBody
 *
 * @apiParam (RequestBody) {String} [name] the name of this senseBox.
 * @apiParam (RequestBody) {String} [grouptag] the grouptag of this senseBox. Send '' (empty string) to delete this property.
 * @apiParam (RequestBody) {Location} [location] the new coordinates of this senseBox. Measurements will keep the reference to their correct location
 * @apiParam (RequestBody) {Sensor[]} [sensors] an array containing the sensors of this senseBox. Only use if model is unspecified
 * @apiParam (RequestBody) {MqttOption} [mqtt] settings for the MQTT integration of this senseBox
 * @apiParam (RequestBody) {TTNOption} [ttn] settings for the TTN integration of this senseBox
 * @apiParam (RequestBody) {String} [description] the updated description of this senseBox. Send '' (empty string) to delete this property.
 * @apiParam (RequestBody) {String} [image] the updated image of this senseBox encoded as base64 data uri.
 * @apiParam (RequestBody) {Object} [addons] allows to add addons to the box. Submit as Object with key `add` and the desired addon as value like `{"add":"feinstaub"}`
 * @apiParamExample {json} Request-Example:
 * {
 *  "_id": "56e741ff933e450c0fe2f705",
 *  "name": "my senseBox",
 *  "description": "this is just a description",
 *  "weblink": "https://opensensemap.org/explore/561ce8acb3de1fe005d3d7bf",
 *  "grouptag": "senseBoxes99",
 *  "exposure": "indoor",
 *  "sensors": [
 *    {
 *      "_id": "56e741ff933e450c0fe2f707",
 *      "title": "UV-Intensität",
 *      "unit": "μW/cm²",
 *      "sensorType": "VEML6070",
 *      "icon": "osem-sprinkles"
 *    }
 *  ],
 *  "location": {
 *    "lng": 8.6956,
 *    "lat": 50.0430
 *  },
 *  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAIVBMVEUAAABKrkMGteh0wW5Ixu931vKy3bO46fj/7hr/+J36/vyFw5EiAAAAAXRSTlMAQObYZgAAAF5JREFUeAFdjdECgzAIA1kIUvP/HzyhdrPe210L2GLYzhjj7VvRefmpn1MKFbdHUOzA9qRQEhIw3xMzEVeJDqkOrC9IJqWE7hFDLZ0Q6+zh7odsoU/j9qeDPXDf/cEX1xsDKIqAkK8AAAAASUVORK5CYII=",
 *  "mqtt": {
 *    "url": "some url",
 *    "topic": "some topic",
 *    "messageFormat": "json",
 *    "decodeOptions": "{\"jsonPath\":\"$.bla\"}"
 *  }
 *  "ttn": {
 *    "app_id": "my-app-id-from-ttn",
 *    "dev_id": "my-dev-id-from-ttn",
 *    "profile": "sensebox/home",
 *    "decodeOptions": "{\"jsonPath\":\"$.bla\"}"
 *  },
 *  "addons": { "add": "feinstaub" }
 * }
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName updateBox
 * @apiUse JWTokenAuth
 * @apiUse BoxIdParam
 * @apiUse ContentTypeJSON
 *
 */
const updateBox = function updateBox (req, res, next) {
  Box.findBoxByIdAndUpdate(req._userParams.boxId, req._userParams)
    .then(function (updatedBox) {
      if (updatedBox._sensorsChanged === true) {
        req.user.mail('newSketch', updatedBox);
      }

      res.send(200, { code: 'Ok', data: updatedBox.toJSON({ includeSecrets: true }) });
      clearCache(['findAllBoxes']);
    })
    .catch(function (err) {
      if (err.name === 'ValidationError') {
        const msgs = [];
        for (const field in err.errors) {
          if (!err.errors[field].errors) {
            msgs.push(err.errors[field].message);
          }
        }

        return next(new restify.UnprocessableEntityError(`validation failed: ${msgs.join(' ')}`));
      }

      if (err.name === 'ModelError') {
        if (err.data && err.data.type) {
          return next(new restify[err.data.type](err.message));
        }

        return next(new restify.BadRequestError(err.message));
      }

      Honeybadger.notify(err);

      return next(new restify.InternalServerError(JSON.stringify(err.message)));
    });
};

/**
 * @api {get} /boxes/:senseBoxId/sensors Get latest measurements of a senseBox
 * @apiDescription Get the latest measurements of all sensors of the specified senseBox.
 * @apiVersion 0.0.1
 * @apiGroup Measurements
 * @apiName getMeasurements
 * @apiUse BoxIdParam
 */
const getMeasurements = function getMeasurements (req, res, next) {
  Box.findAndPopulateBoxById(req._userParams.boxId, { onlyLastMeasurements: true })
    .then(function (box) {
      if (box) {
        res.send(box);
      } else {
        return next(new restify.NotFoundError('No senseBox found'));
      }
    })
    .catch(function (error) {
      const e = error.errors;
      Honeybadger.notify(error);

      return next(new restify.InternalServerError(e));
    });
};

/**
 * @api {get} /boxes/:senseBoxId/locations Get locations of a senseBox
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName getBoxLocations
 * @apiDescription Get all locations of the specified senseBox ordered by date as an array of GeoJSON Points.
 * If `format=geojson`, a GeoJSON linestring will be returned, with `properties.timestamps`
 * being an array with the timestamp for each coordinate.
 *
 * @apiParam {String=json,geojson} format=json
 * @apiUse BoxIdParam
 *
 * @apiSuccessExample {application/json} Example response for :format=json
 * [
 *   { "coordinates": [7.68123, 51.9123], "type": "Point", "timestamp": "2017-07-27T12:00:00Z"},
 *   { "coordinates": [7.68223, 51.9433, 66.6], "type": "Point", "timestamp": "2017-07-27T12:01:00Z"},
 *   { "coordinates": [7.68323, 51.9423], "type": "Point", "timestamp": "2017-07-27T12:02:00Z"}
 * ]
 */
const getBoxLocations = function getBoxLocations (req, res, next) {
  const { format } = req._userParams;

  return Box.findById(req.params.boxId, { locations: 1 })
    .lean()
    .then(function (box) {
      if (!box) {
        return next(new restify.NotFoundError('box not found'));
      }

      if (format === 'geojson') {
        const geo = {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: { timestamps: [] }
        };

        for (const l of box.locations) {
          geo.geometry.coordinates.push(l.coordinates);
          geo.properties.timestamps.push(l.timestamp);
        }
        res.send(200, geo);
      } else {
        res.send(200, box.locations);
      }
    })
    .catch(function (error) {
      Honeybadger.notify(error);

      return next(new restify.InternalServerError());
    });
};

/**
 * @api {get} /boxes/:senseBoxId/area Get area of the measurements for a box
 * @apiDescription Returns a GeoJSON Polygon that approximates the area, where a (mobile) box recorded measurements
 * @apiVersion 0.2.0
 * @apiGroup Boxes
 * @apiName getBoxArea
 * @apiUse BoxIdParam
 * @apiError {Object} 422 The box does not contain enough locations to span an area (eg less than 3 coordinates)
 */
const getBoxArea = function getBoxArea (req, res, next) {
  return Box.findById(req.params.boxId, { locations: 1 })
    .lean()
    .then(function (box) {
      if (!box) {
        return next(new restify.NotFoundError('box not found'));
      }

      const points = featureCollection(box.locations.map(l => {
        return point(l.coordinates);
      }));

      let area = turfConvex(points);
      if (!area) {
        return next(new restify.UnprocessableEntityError('box has not enough locations'));
      }

      area = turfSimplify(area, 0.002); // reduce accuracy to 20m for smaller polygon data
      res.json(area);
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
 * @apiVersion 0.0.1
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

  const { format, delimiter, outliers } = req._userParams,
    outlierWindow = req._userParams['outlier-window'];

  // validate window
  if (outlierWindow < 1 || outlierWindow >= 50) {
    return next(new restify.BadRequestError('parameter outlier-window must be between 1 and 50, default is 15'));
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
      $gte: req._userParams['from-date'].toDate(),
      $lte: req._userParams['to-date'].toDate()
    }
  };

  const measurementsCursor = Measurement
    .find(qry, { 'createdAt': 1, 'value': 1, 'location': 1, '_id': 0 })
    .sort('createdAt')
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
 * @apiVersion 0.1.0
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
  // build query
  const queryParams = {
    'sensors.title': req._userParams.phenomenon
  };

  if (req._userParams.boxId && req._userParams.bbox) {
    return next(new restify.BadRequestError('please specify only boxId or bbox'));
  } else if (!req._userParams.boxId && !req._userParams.bbox) {
    return next(new restify.BadRequestError('please specify either boxId or bbox'));
  }

  if (req._userParams.boxId) {
    queryParams['_id'] = { '$in': req._userParams.boxId };
  }

  // exposure parameter
  if (req._userParams.exposure) {
    queryParams['exposure'] = req._userParams.exposure;
  }

  const { delimiter, columns } = req._userParams;
  Box.findMeasurementsOfBoxesStream({
    query: queryParams,
    bbox: req._userParams['bbox'],
    from: req._userParams['from-date'].toDate(),
    to: req._userParams['to-date'].toDate(),
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
        return next(new restify.NotFoundError(err));
      }

      log.error(err);
      Honeybadger.notify(err);

      return next(new restify.InternalServerError(err));
    });
};

/**
 * @api {post} /boxes/:senseBoxId/:sensorId Post new measurement
 * @apiDescription Posts a new measurement to a specific sensor of a box.
 * @apiVersion 0.0.1
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
  Promise.all([Box.findById(req._userParams.boxId), jsonHandler.decodeMessage([{
    sensor_id: req.params.sensorId,
    value: req.params.value,
    createdAt: req.params.createdAt,
    location: req.params.location
  }])])
    .then(function (results) {
      const [ box, measurements ] = results;
      if (!box) {
        return Promise.reject(next(new restify.NotFoundError('no senseBox found')));
      }

      return box.saveMeasurement(measurements[0]);
    })
    .then(function () {
      res.send(201, 'Measurement saved in box');
    })
    .catch(function (err) {
      let msg;
      if (err) {
        log.error(err);
        Honeybadger.notify(err);

        msg = `${err}`;
        if (err.message) {
          msg = `${err.message}. ${msg}`;
        }
      }

      if (!res.finished) {
        return next(new restify.UnprocessableEntityError(msg));
      }
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
 * @apiVersion 0.1.0
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
  // when the body is an array, restify overwrites the req.params with the given array.
  // to get the boxId, try to extract it from the path
  const boxId = req.path().split('/')[2];
  const handler = decodeHandlers[(
    req._userParams.luftdaten // if
      ? 'luftdaten' // then
      : req.contentType().toLowerCase() // else
  )];
  if (handler) {
    let theBox;
    Box.findById(boxId)
      .then(function (box) {
        if (!box) {
          return Promise.reject(next(new restify.NotFoundError('no senseBox found')));
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
          log.error(err);
          Honeybadger.notify(err);

          msg = `${err}`;
          if (err.message) {
            msg = `${err.message}. ${msg}`;
          }
        }

        if (!res.finished) {
          return next(new restify.UnprocessableEntityError(msg));
        }
      });
  } else {
    return next(new restify.UnsupportedMediaTypeError('Unsupported content-type.'));
  }
};

const geoJsonStringifyReplacer = function geoJsonStringifyReplacer (key, box) {
  if (key === '') {
    const coordinates = box.currentLocation.coordinates;
    box.currentLocation = undefined;
    box.loc = undefined;

    return point(coordinates, box);
  }

  return box;
};

const doNothingStreamTransformFunction = function doNothingStreamTransformFunction (data) {
  return data;
};

/**
 * @api {get} /boxes?date=:date&phenomenon=:phenomenon&format=:format Get all senseBoxes
 * @apiDescription With the optional `date` and `phenomenon` parameters you can find senseBoxes that have submitted data around that time, +/- 4 hours, or specify two dates separated by a comma.
 * @apiName findAllBoxes
 * @apiGroup Boxes
 * @apiVersion 0.1.0
 * @apiParam {ISO8601Date} [date] One or two ISO8601 timestamps at which boxes should provide measurements. Use in combination with `phenomenon`.
 * @apiParam {String} [phenomenon] A sensor phenomenon (determined by sensor name) such as temperature, humidity or UV intensity. Use in combination with `date`.
 * @apiParam {String=json,geojson} [format=json] the format the sensor data is returned in.
 * @apiParam {String} [grouptag] only return boxes with this grouptag, allows to specify multiple separated with a comma
 * @apiParam {String="homeEthernet","homeWifi","homeEthernetFeinstaub","homeWifiFeinstaub","luftdaten_sds011","luftdaten_sds011_dht11","luftdaten_sds011_dht22","luftdaten_sds011_bmp180","luftdaten_sds011_bme280"} [model] only return boxes with this model, allows to specify multiple separated with a comma
 * @apiUse ExposureFilterParam
 * @apiSampleRequest https://api.opensensemap.org/boxes
 * @apiSampleRequest https://api.opensensemap.org/boxes?date=2015-03-07T02:50Z&phenomenon=Temperatur
 * @apiSampleRequest https://api.opensensemap.org/boxes?date=2015-03-07T02:50Z,2015-04-07T02:50Z&phenomenon=Temperatur
 */
const findAllBoxes = function findAllBoxes (req, res, next) {
  const { format, phenomenon, fromDate, toDate } = req._userParams;

  // content-type is always application/json for this route
  res.header('Content-Type', 'application/json; charset=utf-8');
  let stringifier;
  // format
  if (format === 'json') {
    stringifier = jsonstringify({ open: '[', close: ']' });
  } else if (format === 'geojson') {
    stringifier = jsonstringify({ open: '{"type":"FeatureCollection","features":[', close: ']}' }, geoJsonStringifyReplacer);
  }

  const query = {};

  // simple string parameters
  for (const param of ['exposure', 'model', 'grouptag']) {
    if (req._userParams[param]) {
      query[param] = { '$in': req._userParams[param] };
    }
  }

  let lastMeasurementTransformer = streamTransform(doNothingStreamTransformFunction);
  const locFieldTransformer = streamTransform(function locFieldTransformer (box) {
    if (box.currentLocation) {
      box.loc = [{ geometry: box.currentLocation, type: 'Feature' }];
    }

    return box;
  });

  let execStreamBoxesToClientPromise = Promise.resolve(); // no dates specified -> just resolve to exec the boxquery

  if (fromDate && toDate) { // if dates are specified: first query measurments for the dates
    execStreamBoxesToClientPromise = Measurement.aggregate([
      {
        $match: {
          createdAt: {
            '$gt': fromDate.toDate(),
            '$lt': toDate.toDate()
          }
        }
      },
      {
        $group: {
          _id: '$sensor_id',
          value: { $first: '$value' },
          createdAt: { $first: '$createdAt' },
          sensor_id: { $first: '$sensor_id' }
        },
      },
      { $project: { value: 1, createdAt: 1, sensor_id: 1, _id: 0 } }
    ])
      .exec()
      .then(function (measurements) {
        query['sensors._id'] = {
          $in: measurements.map(m => m.sensor_id)
        };
        if (phenomenon) {
          query['sensors.title'] = phenomenon;
        }

        return measurements;
      })
      .catch(function (err) {
        log.error(err);
        Honeybadger.notify(err);

        return next(new restify.InternalServerError(err.message));
      });
  }

  // finally execute the queries
  execStreamBoxesToClientPromise
    .then(function (measurements) {
      if (Array.isArray(measurements)) {
        let measurementsLength = measurements.length;
        lastMeasurementTransformer = streamTransform(function (box) {
          const sensorsLength = box.sensors.length;
          for (let i = 0; i < measurementsLength; i++) { //iterate measurments
            for (let j = 0; j < sensorsLength; j++) {
              if (box.sensors[j]._id.equals(measurements[i].sensor_id)) {

                measurements[i].sensor_id = undefined;
                box.sensors[j].lastMeasurement = measurements[i];
                measurements.splice(i, 1);
                measurementsLength = measurementsLength - 1;

                return box;
              }
            }
          }

          return box;
        });
      }

      Box.find(query, Box.BOX_PROPS_FOR_POPULATION)
        .populate(Box.BOX_SUB_PROPS_FOR_POPULATION)
        .cursor({ lean: true })
        .pipe(lastMeasurementTransformer)
        .pipe(locFieldTransformer) // effects of toJSON must be applied manually for streams
        .pipe(stringifier)
        .pipe(res);
    });
};

/**
 * @api {get} /boxes/:senseBoxId?format=:format Get one senseBox
 * @apiName findBox
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 *
 * @apiUse BoxIdParam
 * @apiParam {String=json,geojson} [format=json] The format the sensor data is returned in. If `geojson`, a GeoJSON Point Feature is returned.
 *
 * @apiSuccessExample Example data on success:
 * {
  "_id": "57000b8745fd40c8196ad04c",
  "createdAt": "2016-06-02T11:22:51.817Z",
  "exposure": "outdoor",
  "grouptag": "",
  "image": "57000b8745fd40c8196ad04c.png?1466435154159",
  "currentLocation": {
    "coordinates": [
      7.64568,
      51.962372
    ],
    "timestamp": "2016-06-02T11:22:51.817Z",
    "type": "Point"
  },
  "name": "Oststr/Mauritzsteinpfad",
  "sensors": [
    {
      "_id": "57000b8745fd40c8196ad04e",
      "lastMeasurement": {
        "value": "0",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "VEML6070",
      "title": "UV-Intensität",
      "unit": "μW/cm²"
    },
    {
      "_id": "57000b8745fd40c8196ad04f",
      "lastMeasurement": {
        "value": "0",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "TSL45315",
      "title": "Beleuchtungsstärke",
      "unit": "lx"
    },
    {
      "_id": "57000b8745fd40c8196ad050",
      "lastMeasurement": {
        "value": "1019.21",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "BMP280",
      "title": "Luftdruck",
      "unit": "hPa"
    },
    {
      "_id": "57000b8745fd40c8196ad051",
      "lastMeasurement": {
        "value": "99.38",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "HDC1008",
      "title": "rel. Luftfeuchte",
      "unit": "%"
    },
    {
      "_id": "57000b8745fd40c8196ad052",
      "lastMeasurement": {
        "value": "0.21",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "HDC1008",
      "title": "Temperatur",
      "unit": "°C"
    },
    {
      "_id": "576996be6c521810002479dd",
      "sensorType": "WiFi",
      "unit": "dBm",
      "title": "Wifi-Stärke",
      "lastMeasurement": {
        "value": "-66",
        "createdAt": "2016-11-11T21:22:01.675Z"
      }
    },
    {
      "_id": "579f9eae68b4a2120069edc8",
      "sensorType": "VCC",
      "unit": "V",
      "title": "Eingangsspannung",
      "lastMeasurement": {
        "value": "2.73",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "icon": "osem-shock"
    }
  ],
  "updatedAt": "2016-11-11T21:22:01.686Z"
}
 */

const findBox = function findBox (req, res, next) {
  const format = req._userParams.format;

  Box.findAndPopulateBoxById(req._userParams.boxId)
    .then(function (box) {
      if (box) {
        if (format === 'json') {
          res.send(box);
        } else if (format === 'geojson') {
          const coordinates = box.currentLocation.coordinates;
          box.currentLocation = undefined;
          box.loc = undefined;
          res.send(point(coordinates, box));
        }
      } else {
        return next(new restify.NotFoundError('No senseBox found'));
      }
    })
    .catch(function (error) {
      const e = error.errors;
      Honeybadger.notify(error);

      return next(new restify.InternalServerError(e));
    });
};

/**
 * @api {post} /boxes Post new senseBox
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName postNewBox
 * @apiDescription Create a new senseBox. This method allows you to submit a new senseBox.
 *
 * ### MQTT Message formats
 * If you specify `mqtt` parameters, the openSenseMap API will try to connect to the MQTT broker
 * specified by you. The parameter `messageFormat` tells the API in which format you are sending
 * measurements in. The accepted formats are listed under `Measurements/Post mutliple new Measurements`
 *
 * @apiParam (RequestBody) {String} name the name of this senseBox.
 * @apiParam (RequestBody) {String} [grouptag] the grouptag of this senseBox.
 * @apiParam (RequestBody) {String="indoor","outdoor","mobile","unknown"} exposure the exposure of this senseBox.
 * @apiParam (RequestBody) {Location} location the coordinates of this senseBox.
 * @apiParam (RequestBody) {String="homeEthernet","homeWifi","homeEthernetFeinstaub","homeWifiFeinstaub","luftdaten_sds011","luftdaten_sds011_dht11","luftdaten_sds011_dht22","luftdaten_sds011_bmp180","luftdaten_sds011_bme280"} [model] specify the model if you want to use a predefined senseBox model, autocreating sensor definitions.
 * @apiParam (RequestBody) {Sensor[]} [sensors] an array containing the sensors of this senseBox. Only use if `model` is unspecified.
 * @apiParam (RequestBody) {Object} [mqtt] specify parameters of the MQTT integration for external measurement upload. Please see below for the accepted parameters
 * @apiParam (RequestBody) {Object} [ttn] specify parameters for the TTN integration for measurement from TheThingsNetwork.org upload. Please see below for the accepted parameters
 *
 * @apiUse LocationBody
 * @apiUse SensorBody
 * @apiUse MqttBody
 * @apiUse TTNBody
 * @apiUse ContentTypeJSON
 * @apiUse JWTokenAuth
 */
const postNewBox = function postNewBox (req, res, next) {
  req.user.addBox(req._userParams)
    .then(function (newBox) {
      return Box.populate(newBox, Box.BOX_SUB_PROPS_FOR_POPULATION);
    })
    .then(function (newBox) {
      res.send(201, { message: 'Box successfully created', data: newBox });
      clearCache(['findAllBoxes', 'getStats']);
    })
    .catch(function (err) {
      if (err.name === 'ModelError') {
        if (err.data && err.data.type) {
          return next(new restify[err.data.type](err.message));
        }

        return next(new restify.BadRequestError(err.message));
      }

      if (err.errors) {
        const msg = Object.keys(err.errors)
          .map(f => `${err.errors[f].message}`)
          .join(', ');

        return next(new restify.UnprocessableEntityError(msg));
      }

      log.error(err);
      Honeybadger.notify(err);

      return next(new restify.InternalServerError(err.message));
    });
};

/**
 * @api {get} /boxes/:senseBoxId/script Download the Arduino script for your senseBox
 * @apiName getScript
 * @apiGroup Boxes
 * @apiVersion 0.1.0
 * @apiUse JWTokenAuth
 * @apiUse BoxIdParam
 */
const getScript = function getScript (req, res, next) {
  res.header('Content-Type', 'text/plain; charset=utf-8');
  Box.findById(req._userParams.boxId)
    .then(function (box) {
      return res.send(200, box.getSketch());
    })
    .catch(function (err) {
      Honeybadger.notify(err);

      return next(new restify.NotFoundError(err.message));
    });
};

/**
 * @api {delete} /boxes/:senseBoxId Mark a senseBox and its measurements for deletion
 * @apiDescription This will delete all the measurements of the senseBox. Please not that the deletion isn't happening immediately.
 * @apiName deleteBox
 * @apiGroup Boxes
 * @apiVersion 0.1.0
 * @apiUse ContentTypeJSON
 * @apiParam {String} password the current password for this user.
 * @apiUse JWTokenAuth
 * @apiUse BoxIdParam
 */
const deleteBox = function deleteBox (req, res, next) {
  const { password } = req._userParams;

  req.user.checkPassword(password)
    .then(function (passwordMatches) {
      if (passwordMatches === false) {
        return next(new restify.BadRequestError('Password not correct.'));
      }

      return req.user.removeBox(req._userParams.boxId);
    })
    .then(function () {
      res.send(200, { code: 'Ok', message: 'box and all associated measurements marked for deletion' });
    })
    .catch(function (err) {
      if (err.message === 'user does not own this senseBox') {
        return next(new restify.ForbiddenError(err.message));
      }
      if (err === 'senseBox not found') {
        return next(new restify.NotFoundError(err));
      }
      Honeybadger.notify(err);

      return next(new restify.InternalServerError(err));
    });
};

module.exports = {
  deleteBox: [
    checkContentType,
    retrieveParameters([
      { name: 'password', dataType: 'String', required: true }
    ]),
    deleteBox
  ],
  getScript,
  getData: [
    retrieveParameter('format', 'String', 'json', ['json', 'csv']),
    retrieveParameter('download', 'String', false, ['true', 'false']),
    retrieveParameter(['delimiter', 'separator'], 'String', ',', { 'comma': ',', 'semicolon': ';' }),
    retrieveParameter('outliers', 'String', false, ['mark', 'replace']),
    retrieveParameter('outlier-window', 'Number', 15),
    parseAndValidateTimeParams,
    getData
  ],
  getDataMulti: [
    retrieveParameter('phenomenon', 'String', true),
    retrieveParameter('bbox', 'Array,Number'),
    retrieveParameter(['delimiter', 'separator'], 'String', ',', { 'comma': ',', 'semicolon': ';' }),
    retrieveParameter('exposure', 'String', false, Box.BOX_VALID_EXPOSURES),
    retrieveParameter('columns', 'Array,String', GET_DATA_MULTI_DEFAULT_COLUMNS, GET_DATA_MULTI_ALLOWED_COLUMNS),
    validateBboxParam,
    parseAndValidateTimeParams,
    getDataMulti
  ],
  updateBox: [
    checkContentType,
    retrieveLocationParameter(),
    retrieveParameters([
      { name: 'name' },
      { name: 'grouptag', dataType: 'StringWithEmpty' },
      { name: 'description', dataType: 'StringWithEmpty' },
      { name: 'weblink', dataType: 'StringWithEmpty' },
      { name: 'image', dataType: 'base64Image' },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES },
      { name: 'mqtt', dataType: 'object' },
      { name: 'ttn', dataType: 'object' },
      { name: 'sensors', dataType: ['object'] },
      { name: 'addons', dataType: 'object' }
    ]),
    updateBox
  ],
  getMeasurements,
  getBoxLocations: [
    retrieveParameter('format', 'String', 'json', ['json', 'geojson']),
    getBoxLocations
  ],
  getBoxArea,
  postNewMeasurement: [
    checkContentType,
    postNewMeasurement
  ],
  postNewMeasurements: [
    retrieveParameter('luftdaten', 'String'),
    postNewMeasurements
  ],
  postNewBox: [
    checkContentType,
    retrieveLocationParameter({ required: true }),
    retrieveParameters([
      { name: 'name', required: true },
      { name: 'grouptag', aliases: ['tag'] },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES },
      { name: 'model', allowedValues: Box.BOX_VALID_MODELS },
      { name: 'sensors', dataType: ['object'] },
      { name: 'weblink' },
      { name: 'mqtt', dataType: 'object' },
      { name: 'ttn', dataType: 'object' }
    ]),
    postNewBox
  ],
  findBox: [
    retrieveParameter('format', 'String', 'json', ['json', 'geojson']),
    findBox
  ],
  findAllBoxes: [
    retrieveParameters([
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES, dataType: 'StringWithEmpty' },
      { name: 'model', dataType: ['StringWithEmpty'] },
      { name: 'grouptag', dataType: ['StringWithEmpty'] },
      { name: 'phenomenon', dataType: 'StringWithEmpty' },
      { name: 'date', dataType: ['ISO8601'] },
      { name: 'format', defaultValue: 'json', allowedValues: ['json', 'geojson'] }
    ]),
    parseAndValidateTimeParamsForFindAllBoxes,
    addCache('5 minutes', 'findAllBoxes'),
    findAllBoxes
  ]
};
