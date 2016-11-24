'use strict';

const models = require('../models'),
  restify = require('restify'),
  Honeybadger = require('../utils').Honeybadger,
  statistics = require('../statistics'),
  requestUtils = require('../requestUtils'),
  area = require('@turf/area');

const { Box, Measurement } = models;
const { meanTransformer, idwTransformer } = statistics;

/**
 * @api {get} /stats Get some statistics about the database
 * @apiDescription returns an array with three numbers which denominates the count of senseBoxes, the count of measurements and the count of measurements in the last minute.
 * @apiName getStatistics
 * @apiGroup Misc
 * @apiVersion 0.1.0
 * @apiSuccessExample {json}
 * [8,13, 2]
 */
const getStatistics = function getStatistics (req, res) {
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
  Promise.all(qrys).then(function (results) {
    res.send(200, results);
  });
};

/**
 * @api {get} /statistics/idw Get a Inverse Distance Weighting Interpolation as FeatureCollection
 * @apiDescription Retrieve a JSON object containing a GeoJSON FeatureCollection with a computed Inverse Distance Interpolation for a certain region of interest and phenomenon.
 * Please be aware that requests with (areaSquareKilometers / cellWidth) > 2500 will be rejected.
 * @apiVersion 0.0.1
 * @apiGroup Interpolation
 * @apiName calculateIdw
 * @apiParam {String} phenomenon the name of the phenomenon you want to download the data for.
 * @apiUse BBoxParam
 * @apiParam {ISO8601Date} [from-date] Beginning date of measurement data (default: 2 days ago from now)
 * @apiParam {ISO8601Date} [to-date] End date of measurement data (default: now)
 * @apiParam {String="indoor","outdoor"} [exposure] only return sensors of boxes with the specified exposure. Can be indoor or outdoor. Default undecided.
 * @apiParam {String="hex","square","triangle"} [gridType=hex] The type of the grid for IDW calculation
 * @apiParam {String="kilometers","miles"} [cellUnit=kilometers] The unit for the width of the grid cells
 * @apiParam {Number} [cellWidth=50] The width of the grid cells in the unit given by the cellUnit parameter
 * @apiParam {Number} [power=1] The power of the IDW calculation
 */

const idwColumns = ['sensorId', 'value', 'lat', 'lng'];

const idwHandler = function (req, res, next) {
  const { phenomenon, bbox, exposure, cellWidth, cellUnit, gridType, power } = req._userParams;

  // build query
  const queryParams = {
    'sensors.title': phenomenon,
    'loc.geometry': {
      '$geoWithin': {
        '$geometry': bbox
      }
    }
  };

  // exposure parameter
  if (exposure) {
    queryParams['exposure'] = exposure;
  }

  // validate params, we don't want too much load on our server!
  const areaSqKm = area(bbox) / 10e6;

  if (areaSqKm / cellWidth > 10000) {
    return next(new restify.UnprocessableEntityError('computation too expensive ((area in square kilometers / cellWidth) > 2500)'));
  }

  Box.findMeasurementsOfBoxesStream(queryParams, phenomenon, req._userParams['from-date'].toDate(), req._userParams['to-date'].toDate(), idwColumns)
    .then(function (cursor) {
      res.header('Content-Type', 'application/json; charset=utf-8');

      cursor
        .pipe(meanTransformer())
        .pipe(idwTransformer({
          bbox,
          gridType,
          cellWidth,
          cellUnit,
          power
        }))
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

module.exports = {
  getStatistics,
  getIdw: [
    requestUtils.retrieveParameter('bbox', 'Array,Number', true),
    requestUtils.retrieveParameter('phenomenon', 'String', true),
    requestUtils.retrieveParameter('exposure', 'String', false, ['indoor', 'outdoor']),
    requestUtils.retrieveParameter('gridType', 'String', 'hex', ['hex', 'square', 'triangle']),
    requestUtils.retrieveParameter('cellWidth', 'Number', 50),
    requestUtils.retrieveParameter('cellUnit', 'String', 'kilometers', ['kilometers', 'miles']),
    requestUtils.retrieveParameter('power', 'Number', 1),
    requestUtils.retrieveParameter('numClasses', 'Number', 6),
    requestUtils.validateBboxParam,
    requestUtils.parseAndValidateTimeParams,
    idwHandler]
};
