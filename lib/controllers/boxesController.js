'use strict';

const restify = require('restify'),
  mongoose = require('mongoose'),
  fs = require('fs'),
  models = require('../models'),
  csvstringify = require('csv-stringify'),
  streamTransform = require('stream-transform'),
  jsonstringify = require('stringify-stream'),
  utils = require('../utils'),
  decodeHandlers = require('../decoding'),
  sketches = require('../sketches'),
  requestUtils = require('../requestUtils'),
  turfHelpers = require('@turf/helpers'),
  outlierTransformer = require('../statistics').outlierTransformer;

const { config, Honeybadger } = utils,
  { Measurement, Box, Sensor } = models,
  { point, featureCollection } = turfHelpers;

/**
 * @api {put} /boxes/:senseBoxId Update a senseBox: Image and sensor names
 * @apiDescription Modify the specified senseBox.
 *
 * @apiUse CommonBoxJSONBody
 * @apiUse SensorBody
 * @apiUse MqttBody
 *
 * @apiParam (RequestBody) {String} description the updated description of this senseBox.
 * @apiParam (RequestBody) {String} image the updated image of this senseBox encoded as base64 data uri.
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
 *  "loc": {
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
  /*
  var newBoxData = {
    _id
    name
    sensors
    description
    weblink
    grouptag
    exposure
    loc
    image
  };
  */

  const qrys = [];
  Box.findById(req._userParams.boxId).then(function (box) {
    if (typeof req.params.name !== 'undefined' && req.params.name !== '') {
      if (box.name !== req.params.name) {
        qrys.push(box.set({ name: req.params.name }));
      }
    }
    if (typeof req.params.exposure !== 'undefined' && req.params.exposure !== '') {
      if (box.exposure !== req.params.exposure) {
        qrys.push(box.set({ exposure: req.params.exposure }));
      }
    }
    if (typeof req.params.grouptag !== 'undefined' && req.params.grouptag !== '') {
      if (box.grouptag !== req.params.grouptag) {
        qrys.push(box.set({ grouptag: req.params.grouptag }));
      }
    }
    if (typeof req.params.weblink !== 'undefined' && req.params.weblink !== '') {
      if (box.weblink !== req.params.weblink) {
        qrys.push(box.set({ weblink: req.params.weblink }));
      }
    }
    if (typeof req.params.description !== 'undefined' && req.params.description !== '') {
      if (box.description !== req.params.description) {
        qrys.push(box.set({ description: req.params.description }));
      }
    }
    if (typeof req.params.loc !== 'undefined' && req.params.loc !== '') {
      if (String(box.loc[0].geometry.coordinates[0]) !== req.params.loc.lng || String(box.loc[0].geometry.coordinates[1]) !== req.params.loc.lat) {
        box.loc[0].geometry.coordinates = [req.params.loc.lng, req.params.loc.lat];
      }
    }
    if (typeof req.params.image !== 'undefined' && req.params.image !== '') {
      const data = req.params.image.toString();
      const imageBuffer = requestUtils.decodeBase64Image(data);
      const extension = (imageBuffer.type === 'image/jpeg') ? '.jpg' : '.png';
      try {
        fs.writeFileSync(`${config.imageFolder}${req._userParams.boxId}${extension}`, imageBuffer.data);
        qrys.push(box.set({ image: `${req._userParams.boxId + extension}?${new Date().getTime()}` }));
      } catch (e) {
        return next(new restify.InternalServerError(JSON.stringify(e.message)));
      }
    }
    if (typeof req.params.mqtt !== 'undefined') {
      const { enabled, url, topic, decodeOptions, connectionOptions, messageFormat } = req.params.mqtt;
      qrys.push(box.set({ 'mqtt': { enabled, url, topic, decodeOptions, connectionOptions, messageFormat } }));
    }
    if (typeof req.params.sensors !== 'undefined' && req.params.sensors.length > 0) {
      req.params.sensors.forEach(function (updatedsensor) {
        if (updatedsensor.deleted) {
          qrys.push(Measurement.find({ sensor_id: updatedsensor._id }).remove());
          qrys.push(Box.update({ 'sensors._id': mongoose.Types.ObjectId(updatedsensor._id) },
            { $pull: { 'sensors': { _id: mongoose.Types.ObjectId(updatedsensor._id) } }
            }));
        } else if (updatedsensor.edited && updatedsensor.new) {
          const newsensor = new Sensor({
            'title': updatedsensor.title,
            'unit': updatedsensor.unit,
            'sensorType': updatedsensor.sensorType,
            'icon': updatedsensor.icon
          });
          box.sensors.push(newsensor);
        } else if (updatedsensor.edited && !updatedsensor.deleted) {
          qrys.push(Box.update({ 'sensors._id': mongoose.Types.ObjectId(updatedsensor._id) }, { '$set': {
            'sensors.$.title': updatedsensor.title,
            'sensors.$.unit': updatedsensor.unit,
            'sensors.$.sensorType': updatedsensor.sensorType,
            'sensors.$.icon': updatedsensor.icon
          } }));
        }
      });
    }
    qrys.push(box.save());

    Promise.all(qrys).then(function () {
      sketches.generateSketch(box);
      res.send(200, box);
    })
    .catch(function (err) {
      if (err.name === 'ValidationError') {
        return next(new restify.UnprocessableEntityError('validation failed'));
      }
      Honeybadger.notify(err);

      return next(new restify.InternalServerError(JSON.stringify(err.message)));
    });
  })
  .catch(function (err) {
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

const getDataTransformerFunction = function getDataTransformerFunction (data) {
  data.createdAt = new Date(data.createdAt).toISOString();

  return data;
};

/**
 * @apiDefine SeparatorParam
 *
 * @apiParam {String=comma,semicolon} [delimiter=comma] Only for csv: the delimiter for csv. Possible values: `semicolon`, `comma`. Per default a comma is used. Alternatively you can use separator as parameter name.
 */

/**
 * @api {get} /boxes/:senseBoxId/data/:sensorId?from-date=fromDate&to-datetoDate&download=true&format=json Get the 10000 latest measurements for a sensor
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

  if (format === 'csv') {
    res.header('Content-Type', 'text/csv');
    const csvColumns = ['createdAt', 'value'];
    if (outliers) {
      csvColumns.push('isOutlier');
    }

    stringifier = csvstringify({ columns: csvColumns, header: 1, delimiter });
  } else if (format === 'json') {
    res.header('Content-Type', 'application/json; charset=utf-8');
    stringifier = jsonstringify({ open: '[', close: ']' });
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


  const measurementsCursor = Measurement.find(qry, { 'createdAt': 1, 'value': 1, '_id': 0 }) // do not send _id column
    .cursor({ batchSize: 500, lean: true, limit: queryLimit });

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
 * @apiParam {String} [columns=createdAt,value,lat,lon] (optional) Comma separated list of columns to export. If omitted, columns createdAt, value, lat, lon are returned. Possible allowed values are createdAt, value, lat, lon, unit, boxId, sensorId, phenomenon, sensorType, boxName, exposure. The columns in the csv are like the order supplied in this parameter
 * @apiParam {String="indoor","outdoor"} [exposure] (optional) only return sensors of boxes with the specified exposure. Can be indoor or outdoor
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
    queryParams['_id'] = {
      '$in': req._userParams.boxId
    };
  } else if (req._userParams.bbox) {
    // transform bounds to polygon
    queryParams['loc.geometry'] = {
      '$geoWithin': {
        '$geometry': req._userParams.bbox
      }
    };
  }

  // exposure parameter
  if (req._userParams.exposure) {
    queryParams['exposure'] = req._userParams.exposure;
  }

  const { delimiter, columns } = req._userParams;
  Box.findMeasurementsOfBoxesStream({
    query: queryParams,
    from: req._userParams['from-date'].toDate(),
    to: req._userParams['to-date'].toDate(),
    columns,
    transformations: { parseAndStringifyValues: true }
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

      console.log(err);
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
 * @apiUse ContentTypeJSON
 * @apiParam (RequestBody) {String} value the measured value of the sensor. Also accepts JSON float numbers.
 * @apiParam (RequestBody) {ISO8601Date} [createdAt] the timestamp of the measurement. Should be parseable by JavaScript.
 */
const jsonHandler = decodeHandlers.json;
const postNewMeasurement = function postNewMeasurement (req, res, next) {
  Box.findById(req._userParams.boxId)
    .exec()
    .then(function (box) {
      if (!box) {
        return next(new restify.NotFoundError('no senseBox found'));
      }

      // decode the body..
      let measurements;
      try {
        measurements = jsonHandler.decodeMessage([{
          sensor_id: req.params.sensorId,
          value: req.params.value,
          createdAt: req.params.createdAt
        }]);
      } catch (err) {
        return next(new restify.UnprocessableEntityError(err.message));
      }

      return box.saveMeasurement(measurements[0])
        .then(function () {
          res.send(201, 'Measurement saved in box');
        });
    })
    .catch(function (err) {
      console.log(err);
      Honeybadger.notify(err);

      return next(new restify.UnprocessableEntityError(`${err.message}. ${err}`));
    });
};

/**
 * @api {post} /boxes/:boxId/data Post multiple new measurements
 * @apiDescription Post multiple new measurements in multiple formats to a box. Allows the use of csv, json array and json object notation.
 *
 * **CSV:**<br/>
 * For data in csv format, first use `content-type: text/csv` as header, then submit multiple values as lines in `sensorId,value,[createdAt]` form.
 * Timestamp is optional. Do not submit a header.
 *
 * **JSON Array:**<br/>
 * You can submit your data as array. Your measurements should be objects with the keys `sensor`, `value` and optionally `createdAt`. Specify the header `content-type: application/json`.
 *
 * **JSON Object:**<br/>
 * The third form is to encode your measurements in an object. Here, the keys of the object are the sensorIds, the values of the object are either just the `value` of your measurement or an array of the form `[value, createdAt]`
 *
 * For all encodings, the maximum count of values in one request is 2500.
 *
 * @apiVersion 0.1.0
 * @apiGroup Measurements
 * @apiName postNewMeasurements
 * @apiUse BoxIdParam
 * @apiParamExample {application/json} JSON-Object:
 * {
 *   "sensorID": "value",
 *   "anotherSensorID": ["value", "createdAt as ISO8601-timestamp"],
 *   "sensorIDtheThird": ["value"]
 *   ...
 * }
 * @apiParamExample {application/json} JSON-Array:
 * [
 *   {"sensor":"sensorID", "value":"value"},
 *   {"sensor":"anotherSensorId", "value":"value", "createdAt": "ISO8601-timestamp"}
 *   ...
 * ]
 * @apiParamExample {text/csv} CSV:
 * sensorID,value
 * anotherSensorId,value,ISO8601-timestamp
 * sensorIDtheThird,value
 * ...
 */
const postNewMeasurements = function postNewMeasurements (req, res, next) {
  // when the body is an array, restify overwrites the req.params with the given array.
  // to get the boxId, try to extract it from the path
  const boxId = req.path().split('/')[2];
  const handler = decodeHandlers[req.contentType().toLowerCase()];
  if (handler) {
    // decode the body..
    let measurements;
    try {
      measurements = handler.decodeMessage(req.body);
    } catch (err) {
      return next(new restify.UnprocessableEntityError(err.message));
    }
    Box.findById(boxId)
      .then(function (box) {
        if (!box) {
          return next(new restify.NotFoundError('no senseBox found'));
        }

        return box.saveMeasurementsArray(measurements)
          .then(function () {
            res.send(201, 'Measurements saved in box');
          });
      })
      .catch(function (err) {
        console.log(err);
        Honeybadger.notify(err);

        return next(new restify.UnprocessableEntityError(`${err.message}. ${err}`));
      });
  } else {
    return next(new restify.UnsupportedMediaTypeError('Unsupported content-type.'));
  }
};

const geoJsonStringifyReplacer = function geoJsonStringifyReplacer (key, value) {
  if (key === '') {
    const coordinates = value.loc[0].geometry.coordinates;
    value.loc = undefined;

    return point(coordinates, value);
  }

  return value;
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
 * @apiParam {String="json","geojson"} [format=json] the format the sensor data is returned in.
 * @apiParam {String="indoor","outdoor"} [exposure] (optional) only return sensors of boxes with the specified exposure. Can be indoor or outdoor
 * @apiSampleRequest https://api.opensensemap.org/boxes
 * @apiSampleRequest https://api.opensensemap.org/boxes?date=2015-03-07T02:50Z&phenomenon=Temperatur
 * @apiSampleRequest https://api.opensensemap.org/boxes?date=2015-03-07T02:50Z,2015-04-07T02:50Z&phenomenon=Temperatur
 */
const findAllBoxes = function findAllBoxes (req, res, next) {
  const { format, phenomenon, fromDate, toDate, exposure } = req._userParams;

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

  // exposure parameter
  if (exposure) {
    query['exposure'] = exposure;
  }

  let lastMeasurementTransformer = streamTransform(doNothingStreamTransformFunction);

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
         console.log(err);
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
                console.log(measurementsLength);

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
        .cursor({ batchSize: 500, lean: true })
        .pipe(lastMeasurementTransformer)
        .pipe(stringifier)
        .pipe(res);
    });
};

/**
 * @api {get} /boxes/:boxId Get one senseBox
 * @apiName findBox
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiUse BoxIdParam
 * @apiParam {String="json","geojson"} [format=json] the format the sensor data is returned in.
 * @apiSuccessExample Example data on success:
 * {
  "_id": "57000b8745fd40c8196ad04c",
  "boxType": "fixed",
  "createdAt": "2016-06-02T11:22:51.817Z",
  "exposure": "outdoor",
  "grouptag": "",
  "image": "57000b8745fd40c8196ad04c.png?1466435154159",
  "loc": [
    {
      "geometry": {
        "coordinates": [
          7.64568,
          51.962372
        ],
        "type": "Point"
      },
      "type": "feature"
    }
  ],
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
          const coordinates = box.loc[0].geometry.coordinates;
          box.loc = undefined;
          res.send(featureCollection(point(coordinates, box)));
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
 * @apiDescription Create a new senseBox. This method allows you to submit a new senseBox.
 *
 * If you specify `mqtt` parameters, the openSenseMap API will try to connect to the MQTT broker
 * specified by you. The parameter `messageFormat` tells the API in which format you are sending
 * measurements in.
 *
 * For `json`, the format is:
 * ```
 * {
 *   "sensorId": <value>,
 *   "sensorId": [<value>,<createdAt>]
 *   ...
 * }
 * ```
 *
 * For `csv`, the format is:
 * ```
 * sensorId,value
 * sensorId,value,createdAt
 * ...
 * ```
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName postNewBox
 * @apiUse CommonBoxJSONBody
 * @apiUse SensorBody
 * @apiUse MqttBody
 * @apiUse ContentTypeJSON
 * @apiUse JWTokenAuth
 *
 */
const postNewBox = function postNewBox (req, res, next) {
  req.user.addBox(req)
    .then(function (newBox) {
      res.send(201, { message: 'Box successfully created', data: newBox });
    })
    .catch(function (err) {
      if (err.errors) {
        const msg = Object.keys(err.errors)
          .map(f => `Parameter ${f} ${err.errors[f].message}`)
          .join(', ');

        return next(new restify.UnprocessableEntityError(msg));
      }

      console.log(err);
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
  Box.findById(req._userParams.boxId)
    .then(function (box) {
      const file = `${config.targetFolder}${box._id}.ino`;

      if (!fs.existsSync(file)) {
        sketches.generateSketch(box);
      }

      return res.send(200, fs.readFileSync(file, 'utf-8'));
    })
    .catch(function (err) {
      Honeybadger.notify(err);

      return next(new restify.NotFoundError(err.message));
    });
};

/**
 * @api {delete} /boxes/:senseBoxId Delete a senseBox and its measurements
 * @apiName deleteBox
 * @apiGroup Boxes
 * @apiVersion 0.1.0
 * @apiUse JWTokenAuth
 * @apiUse BoxIdParam
 */
const deleteBox = function deleteBox (req, res, next) {
  req.user.removeBox(req._userParams.boxId)
    .then(function () {
      res.send(200, { code: 'Ok', message: 'box and all associated measurements successfully deleted' });
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
  deleteBox,
  getScript,
  getData: [
    requestUtils.retrieveParameter('format', 'String', 'json', ['json', 'csv']),
    requestUtils.retrieveParameter('download', 'String', false, ['true', 'false']),
    requestUtils.retrieveParameter(['delimiter', 'separator'], 'String', ',', { 'comma': ',', 'semicolon': ';' }),
    requestUtils.retrieveParameter('outliers', 'String', false, ['mark', 'replace']),
    requestUtils.retrieveParameter('outlier-window', 'Number', 15),
    requestUtils.parseAndValidateTimeParams,
    getData
  ],
  getDataMulti: [
    requestUtils.retrieveParameter('phenomenon', 'String', true),
    requestUtils.retrieveParameter('bbox', 'Array,Number'),
    requestUtils.retrieveParameter(['delimiter', 'separator'], 'String', ',', { 'comma': ',', 'semicolon': ';' }),
    requestUtils.retrieveParameter('exposure', 'String', false, ['indoor', 'outdoor']),
    requestUtils.retrieveParameter('columns', 'Array,String', requestUtils.GET_DATA_MULTI_DEFAULT_COLUMNS, requestUtils.GET_DATA_MULTI_ALLOWED_COLUMNS),
    requestUtils.validateBboxParam,
    requestUtils.parseAndValidateTimeParams,
    getDataMulti
  ],
  updateBox: [
    requestUtils.checkContentType,
    updateBox
  ],
  getMeasurements,
  postNewMeasurement: [
    requestUtils.checkContentType,
    postNewMeasurement
  ],
  postNewMeasurements,
  postNewBox: [
    requestUtils.checkContentType,
    postNewBox
  ],
  findBox: [
    requestUtils.retrieveParameter('format', 'String', 'json', ['json', 'geojson']),
    findBox
  ],
  findAllBoxes: [
    requestUtils.retrieveParameter('exposure', 'String', false, ['indoor', 'outdoor']),
    requestUtils.retrieveParameter('phenomenon', 'String'),
    requestUtils.retrieveParameter('date', 'String'),
    requestUtils.retrieveParameter('format', 'String', 'json', ['json', 'geojson']),
    requestUtils.parseAndValidateTimeParamsForFindAllBoxes,
    findAllBoxes
  ]
};
