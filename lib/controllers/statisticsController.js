'use strict';

const models = require('../models');

const { Box, Measurement } = models;

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

module.exports = {
  getStatistics
};
