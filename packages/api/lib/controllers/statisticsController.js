'use strict';

const { Box, Measurement } = require('@sensebox/opensensemap-api-models'),
  { UnprocessableEntityError, BadRequestError } = require('restify-errors'),
  idwTransformer = require('../transformers/idwTransformer'),
  { addCache, createDownloadFilename, computeTimestampTruncationLength, csvStringifier } = require('../helpers/apiUtils'),
  { retrieveParameters, validateFromToTimeParams } = require('../helpers/userParamHelpers'),
  area = require('@turf/area'),
  millify = require('millify'),
  handleError = require('../helpers/errorHandler'),
  ms = require('ms'),
  DescriptiveStatisticsTransformer = require('../transformers/descriptiveStatisticsTransformer'),
  dashify = require('dashify'),
  jsonstringify = require('stringify-stream');

/**
 * @api {get} /stats Get some statistics about the database
 * @apiDescription returns an array with three numbers which denominates the count of senseBoxes, the count of measurements and the count of measurements in the last minute.
 * @apiName getStatistics
 * @apiGroup Misc
 * @apiParam {Boolean=true,false} [human=false] if true, make numbers easier human readable.
 * @apiSuccessExample {json} [human=false]
 * [318,118241889,393]
 * @apiSuccessExample {json} [human=true]
 * ["318","118M","393"]
 */
const getStatistics = function getStatistics (req, res) {
  const { human } = req._userParams;
  const qrys = [
    Box.count({}),
    Measurement.count({}),
    Measurement.count({
      createdAt: {
        '$gt': new Date(Date.now() - 60000),
        '$lt': new Date()
      }
    })
  ];
  Promise.all(qrys)
    .then(function (results) {
      if (human === 'true') {
        results = results.map(r => millify(r).toString());
      }
      res.send(200, results);
    });
};

/**
 * @api {get} /statistics/idw?bbox=7.6,51.2,7.8,51.4&phenomenon=Temperatur Get a Inverse Distance Weighting Interpolation as FeatureCollection
 * @apiDescription Retrieve a JSON object containing
 *  - `breaks`: an array containing equal distance breaks. Use `numClasses` parameter to control how many breaks to return.
 *  - `featureCollection`: a GeoJSON FeatureCollection with a computed Inverse Distance Interpolation for a certain region of interest and phenomenon.
 *  - `timesteps`: an array of RFC 3339 formatted timesteps. Use `numTimeSteps` parameter to control how many timesteps between `from-date` and `to-date` should be returned.
 *
 * The properties of each feature in the featureCollection is an object with RFC 3339 timestamps which are the timeSteps. The number of the timesteps can be controlled using the `numTimeSteps` parameter. Values falling inside each timestep are first averaged.
 * Please be aware that requests with (areaSquareKilometers / cellWidth) > 2500 will be rejected.
 * @apiGroup Interpolation
 * @apiName calculateIdw
 * @apiParam {String} phenomenon the name of the phenomenon you want to download the data for.
 * @apiUse BBoxParam
 * @apiUse ExposureFilterParam
 * @apiParam {RFC3339Date} [from-date] Beginning date of measurement data (default: 2 days ago from now)
 * @apiParam {RFC3339Date} [to-date] End date of measurement data (default: now)
 * @apiParam {String=hex,square,triangle} [gridType=hex] The type of the grid for IDW calculation
 * @apiParam {Number} [cellWidth=50] The width of the grid cells in kilometers. Must be positive
 * @apiParam {Number=1-9} [power=1] The power of the IDW calculation
 * @apiParam {Number=1-10} [numTimeSteps=6] Return this many timesteps between `from-date` and `to-date`
 * @apiParam {Number} [numClasses=6] Number of classes in the breaks array. Must be positive
 */

const idwColumns = ['sensorId', 'value', 'lat', 'lon'];

const idwHandler = function (req, res, next) {
  const { phenomenon, bbox, exposure, cellWidth, gridType, power, numTimeSteps, numClasses, fromDate, toDate } = req._userParams;

  // validate bbox param, we don't want too much load on our server!
  const areaSqKm = area(bbox) / 10e6;

  if (areaSqKm / cellWidth > 2500) {
    return next(new UnprocessableEntityError('planned computation too expensive ((area in square kilometers / cellWidth) > 2500)'));
  }

  // build query
  const queryParams = { 'sensors.title': phenomenon };

  // exposure parameter
  if (exposure) {
    queryParams['exposure'] = { '$in': exposure };
  }

  Box.findMeasurementsOfBoxesStream({
    query: queryParams,
    bbox: bbox,
    from: fromDate.toDate(),
    to: toDate.toDate(),
    columns: idwColumns,
    order: { createdAt: 1 },
    transformations: { parseTimestamps: true, parseValues: true }
  })
    .then(function (cursor) {
      res.header('Content-Type', 'application/json; charset=utf-8');

      cursor
        .on('error', function (err) {
          return handleError(err, next);
        })
        .pipe(idwTransformer({
          numTimeSteps,
          numClasses,
          toDate,
          fromDate,
          bbox,
          gridType,
          cellWidth,
          power
        }))
        .on('error', function (err) {
          res.end(`Error: ${err.message}`);
        })
        .pipe(res);

    })
    .catch(function (err) {
      handleError(err, next);
    });

};

/**
 * @api {get} /statistics/descriptive Compute basic descriptive statistics over specified time windows
 * @apiDescription Allows to compute basic descriptive statistical methods over multiple sensors and multiple time windows.
 * The supported methods are: arithmetic mean, geometric mean, harmonic mean, maximum, median ,minimum, mode, root mean square, standard deviation, sum of values and variance.
 * Parameters `from-date` and `to-date` are modified to fit you specified `window` parameter.
 * You should either specifiy multiple station ids using the `boxId` parameter or a bounding box with the `bbox` parameter, but not both.
 *
 * By default, stations with exposure `mobile` are excluded.
 * @apiGroup Statistics
 * @apiName descriptive
 * @apiParam {String} boxId Comma separated list of senseBox IDs.
 * @apiParam {String} phenomenon the name of the phenomenon you want to download the data for.
 * @apiUse BBoxParam
 * @apiUse ExposureFilterParam
 * @apiParam {RFC3339Date} from-date Beginning date of measurement data
 * @apiParam {RFC3339Date} to-date End date of measurement data
 * @apiParam {String=arithmeticMean,geometricMean,harmonicMean,max,median,min,mode,rootMeanSquare,standardDeviation,sum,variance} operation Statistical operation to execute
 * @apiParam {String} window Time window to apply. Either a number in Milliseconds or a [`zeit/ms`](https://npmjs.com/ms)-parseable string rounded to the nearest minute (Math.round(<window-in-milliseconds>) / 60000). At least 1 minute
 * @apiParam {Boolean=true,false} [download=true] Set the `content-disposition` header to force browsers to download instead of displaying.
 * @apiParam {String} boxId Comma separated list of senseBox IDs.
 * @apiUse SeparatorParam
 * @apiParam {String=boxId,boxName,exposure,height,lat,lon,phenomenon,sensorType,unit} [columns] Comma separated list of additional columns to export.
 * @apiParam {String=csv,json} [format=csv] Can be 'csv' (default) or 'json' (default: csv)
 * @apiSuccessExample {text/csv} Example CSV:
 *  sensorId,Temperatur_2018-01-31,Temperatur_2018-02-01Z,Temperatur_2018-02-02Z,Temperatur_2018-02-03Z,Temperatur_2018-02-04Z,Temperatur_2018-02-05Z,Temperatur_2018-02-06Z,Temperatur_2018-02-07Z
 *  5a787e38d55e821b639e890f,,,138,104,56,17,,
 *  5a787e38d55e821b639e8915,,,138,104,56,17,,
 * @apiSuccessExample {application/json} Example JSON:
 *  sensorId,Temperatur_2018-01-31,Temperatur_2018-02-01Z,Temperatur_2018-02-02Z,Temperatur_2018-02-03Z,Temperatur_2018-02-04Z,Temperatur_2018-02-05Z,Temperatur_2018-02-06Z,Temperatur_2018-02-07Z
 *  [
 *    {
 *      "sensorId": "5a787e38d55e821b639e890f",
 *      "2018-02-02T00:00:00.000Z": 138,
 *      "2018-02-03T00:00:00.000Z": 104,
 *      "2018-02-04T00:00:00.000Z": 56,
 *      "2018-02-05T00:00:00.000Z": 17
 *    },
 *    {
 *      "sensorId": "5a787e38d55e821b639e8915",
 *      "2018-02-02T00:00:00.000Z": 138,
 *      "2018-02-03T00:00:00.000Z": 104,
 *      "2018-02-04T00:00:00.000Z": 56,
 *      "2018-02-05T00:00:00.000Z": 17
 *    }
 *  ]
 */
const minWindowLengthMs = ms('1m');
const descriptiveStatisticsHandler = function descriptiveStatisticsHandler (req, res, next) {
  const { boxId, bbox, exposure, delimiter, columns, phenomenon, operation, download, format } = req._userParams;
  let { fromDate, toDate, window } = req._userParams;

  window = Math.round(ms(window) / minWindowLengthMs) * minWindowLengthMs;
  if (!window || window < minWindowLengthMs) {
    return next(new BadRequestError(`Invalid window length. Smallest window size is ${ms(minWindowLengthMs, { long: true })}.`));
  }

  // compute start and end times in milliseconds
  //
  fromDate = fromDate.valueOf() - (fromDate.valueOf() % window);
  // always overshoot one window..
  toDate = toDate.valueOf() - (toDate.valueOf() % window) + window;

  const windows = [new Date(fromDate)];
  // compute all possible windows
  for (let i = 1; windows[i - 1].getTime() !== toDate; i = i + 1) {
    windows.push(new Date(fromDate + window * i));
  }

  fromDate = new Date(fromDate);
  // add another window to toDate query parameter to get enough data
  toDate = new Date(toDate + window);

  if (boxId && bbox) {
    return next(new BadRequestError('please specify only boxId or bbox'));
  } else if (!boxId && !bbox) {
    return next(new BadRequestError('please specify either boxId or bbox'));
  }

  const opts = {
    query: {
      'sensors.title': phenomenon,
      'exposure': { '$not': /mobile/ }
    },
    bbox,
    from: fromDate,
    to: toDate,
    // add sensorId, value and createdAt to query columns
    columns: ['createdAt', 'sensorId', 'value', ...columns],
    order: { sensor_id: 1, createdAt: 1 },
    transformations: { parseValues: true },
  };

  if (boxId) {
    opts.query['_id'] = { '$in': boxId };
  }

  // exposure parameter
  if (exposure) {
    // remove mobile boxes
    if (exposure.includes('mobile')) {
      exposure.splice(exposure.indexOf('mobile', 1));
    }
    opts.query['exposure'] = { '$in': exposure };
  }

  Box.findMeasurementsOfBoxesStream(opts)
    .then(function (cursor) {
      let stringifier;

      switch (format) {
      /* eslint-disable no-case-declarations*/
      case 'csv':
        res.header('Content-Type', 'text/csv');
        // get end parameter for timestamp substring
        const timestampSubstringEnd = computeTimestampTruncationLength(window);
        // construct the columns for csv stringify in correct order
        // (sensorId, <user specified columns>, <averageWindows>)
        // Start with sensorId. It should always be the the first column
        // append the wanted columns and the windows
        const csvColumns = {};
        for (const col of ['sensorId', ...columns, ...windows]) {
          // is a date?
          if (typeof col.toISOString === 'function') {
            csvColumns[col] = `${dashify(phenomenon, { condense: true })}_${col.toISOString().substring(0, timestampSubstringEnd)}Z`;
          } else { // otherwise just append
            csvColumns[col] = col;
          }
        }
        stringifier = csvStringifier(csvColumns, delimiter);
        break;
        /* eslint-enable no-case-declarations*/
      case 'json':
        res.header('Content-Type', 'application/json');
        stringifier = jsonstringify({ open: '[', close: ']' }, ['sensorId', ...columns, ...windows.map(w => w.toISOString())]);
        break;
      }

      if (download === 'true') {
        res.header('Content-Disposition', `attachment; filename=${createDownloadFilename(req.date(), operation, [phenomenon, ...columns], format)}`);
      }

      // stream response to client
      cursor
        .on('error', function (err) {
          return handleError(err, next);
        })
        .pipe(new DescriptiveStatisticsTransformer({
          operation,
          windows,
          // JSON.stringify does not stringify keys of type Date their to ISO8601
          // representation like it does for Dates as values
          stringifyWindowTimestampKeys: (format === 'json')
        }))
        .on('error', function (err) {
          return handleError(err, next);
        })
        .pipe(stringifier)
        .on('error', function (err) {
          return handleError(err, next);
        })
        .pipe(res);
    })
    .catch(function (err) {
      handleError(err, next);
    });

};

module.exports = {
  getStatistics: [
    retrieveParameters([
      { name: 'human', allowedValues: ['true', 'false'], defaultValue: 'false' }
    ]),
    addCache('5 minutes', 'getStats'),
    getStatistics
  ],
  getIdw: [
    retrieveParameters([
      { predef: 'bbox', required: true },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES, dataType: ['String'] },
      { name: 'phenomenon', required: true },
      { name: 'gridType', defaultValue: 'hex', allowedValues: ['hex', 'square', 'triangle'] },
      { name: 'cellWidth', dataType: 'Number', defaultValue: 50, min: 0.001 },
      { name: 'power', dataType: 'Number', defaultValue: 1, min: 1, max: 9 },
      { name: 'numTimeSteps', dataType: 'Integer', defaultValue: 6, min: 1, max: 10 },
      { name: 'numClasses', dataType: 'Integer', defaultValue: 6, min: 1 },
      { predef: 'toDate' },
      { predef: 'fromDate' }
    ]),
    validateFromToTimeParams,
    idwHandler
  ],
  descriptiveStatisticsHandler: [
    retrieveParameters([
      { name: 'boxId', aliases: ['senseboxid', 'senseboxids', 'boxid', 'boxids'], dataType: ['id'] },
      { name: 'phenomenon', required: true },
      { predef: 'delimiter' },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES, dataType: ['String'] },
      { name: 'columns', dataType: ['String'], defaultValue: [], allowedValues: ['boxId', 'boxName', 'exposure', 'height', 'lat', 'lon', 'phenomenon', 'sensorType', 'unit'] },
      { predef: 'bbox' },
      { predef: 'toDateNoDefault', required: true },
      { predef: 'fromDateNoDefault', required: true },
      { name: 'window', required: true },
      { name: 'operation', required: true, allowedValues: ['arithmeticMean', 'geometricMean', 'harmonicMean', 'max', 'median', 'min', 'mode', 'rootMeanSquare', 'standardDeviation', 'sum', 'variance'] },
      { name: 'download', defaultValue: 'true', allowedValues: ['true', 'false'] },
      { name: 'format', defaultValue: 'csv', allowedValues: ['csv', 'json'] }
    ]),
    validateFromToTimeParams,
    descriptiveStatisticsHandler
  ]
};
