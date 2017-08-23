'use strict';

const models = require('../models'),
  { UnprocessableEntityError } = require('restify-errors'),
  statistics = require('../statistics'),
  { addCache } = require('../helpers/apiUtils'),
  { retrieveParameters, validateFromToTimeParams } = require('../helpers/userParamHelpers'),
  area = require('@turf/area'),
  millify = require('millify'),
  handleError = require('../helpers/errorHandler');

const { Box, Measurement } = models;
const { idwTransformer } = statistics;

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
 *  - `timesteps`: an array of ISO8601 formatted timesteps. Use `numTimeSteps` parameter to control how many timesteps between `from-date` and `to-date` should be returned.
 *
 * The properties of each feature in the featureCollection is an object with ISO8601 timestamps which are the timeSteps. The number of the timesteps can be controlled using the `numTimeSteps` parameter. Values falling inside each timestep are first averaged.
 * Please be aware that requests with (areaSquareKilometers / cellWidth) > 2500 will be rejected.
 * @apiGroup Interpolation
 * @apiName calculateIdw
 * @apiParam {String} phenomenon the name of the phenomenon you want to download the data for.
 * @apiUse BBoxParam
 * @apiUse ExposureFilterParam
 * @apiParam {ISO8601Date} [from-date] Beginning date of measurement data (default: 2 days ago from now)
 * @apiParam {ISO8601Date} [to-date] End date of measurement data (default: now)
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
    queryParams['exposure'] = exposure;
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
      { name: 'exposure', allowedValues: models.Box.BOX_VALID_EXPOSURES },
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
  ]
};
