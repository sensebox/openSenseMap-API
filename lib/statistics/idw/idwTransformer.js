'use strict';

const Transform = require('stream').Transform,
  inherits = require('util').inherits,
  point = require('@turf/helpers').point,
  feature = require('@turf/helpers').feature,
  distance = require('@turf/distance'),
  /* eslint-disable global-require */
  grids = {
    'hex': require('@turf/hex-grid'),
    'square': require('@turf/square-grid'),
    'triangle': require('@turf/triangle-grid'),
  },
  /* eslint-enable global-require */
  centroid = require('@turf/centroid'),
  bbox = require('@turf/bbox'),
  moment = require('moment');


const idwTransformer = function (idwTransformerOptions, streamOptions) {
  if (!(this instanceof idwTransformer)) {
    return new idwTransformer(idwTransformerOptions, streamOptions);
  }

  if (!streamOptions) {
    streamOptions = {};
  }
  streamOptions.decodeStrings = false;
  streamOptions.objectMode = true;


  this._isFirst = true; // used for prepending featureCollection

  // variables for average
  this._averages = {};

  this._idwOptions = idwTransformerOptions;

  this._samplingGrid = grids[this._idwOptions.gridType](bbox(this._idwOptions.bbox), this._idwOptions.cellWidth, 'kilometers');
  this._idwPromises = [];

  // calculate timeSteps
  this._diffTimeSteps = this._idwOptions.toDate.diff(this._idwOptions.fromDate);
  this._diffTimeSteps = this._diffTimeSteps / (this._idwOptions.numTimeSteps + 1); // this method yiels numTimeSteps - 1 steps, but the user wants numTimeSteps

  // calculate the first timestep limit
  this._currTimeStepStart = this._idwOptions.fromDate;
  this._currTimeStepMid = this._currTimeStepStart.clone();
  this._currTimeStepMid.add(this._diffTimeSteps / 2, 'milliseconds');
  this._currTimeStepEnd = this._currTimeStepStart.clone().add(this._diffTimeSteps, 'milliseconds');
  //this.calculateNextTimeStepLimit();

  Transform.call(this, streamOptions);
};

idwTransformer.prototype.calculateNextTimeStepLimit = function calculateNextTimeStepLimit () {
  this._currTimeStepMid = this._currTimeStepStart.clone().add(this._diffTimeSteps / 2);
  this._currTimeStepEnd.add(this._diffTimeSteps);
  this._currTimeStepStart.add(this._diffTimeSteps);
};

idwTransformer.prototype.resetAverageAndReturnControlPoints = function resetAverageAndReturnControlPoints () {
  const controlPoints = Object.values(this._averages).map(a => a.geom);

  this._averages = {};

  return controlPoints;
};
idwTransformer.prototype.addMeasurementToAverage = function addMeasurementToAverage (measurement, cb) {
  if (!Object.keys(this._averages).includes(measurement.sensorId)) {
    this._averages[measurement.sensorId] = {
      count: 0,
      geom: point([measurement.lng, measurement.lat], { average: parseFloat(measurement.value) })
    };

    return cb();
  }

  const avg = this._averages[measurement.sensorId];

  avg.count = avg.count + 1;
  avg.geom.properties.average = (
      ((avg.geom.properties.average * avg.count) + parseFloat(measurement.value)) /
      (avg.count + 1)
     );

  cb();
};

idwTransformer.prototype.calculateIdwForControlPoints = function calculateIdwForControlPoints (controlPoints, ts) {
  // calculate idw
  //  let isFirst = true;
  const timestamp = ts.clone();
  const N = this._samplingGrid.features.length;
  for (let i = 0; i < N; i++) {
    let zw = 0;
    let sw = 0;
    // calculate the distance from each control point to cell's centroid
    for (let j = 0; j < controlPoints.length; j++) {
      const d = distance(centroid(this._samplingGrid.features[i]), controlPoints[j], 'kilometers');
      if (d === 0) {
        zw = controlPoints[j].properties.average;
      }
      const w = 1.0 / Math.pow(d, this._idwOptions.power);
      sw = sw + w;
      zw = zw + (w * controlPoints[j].properties.average);
    }

    // write IDW value for each grid cell
    this._samplingGrid.features[i].properties[timestamp.toISOString()] = zw / sw;
  }

  return Promise.resolve();
};

idwTransformer.prototype._transform = function _transform (data, encoding, callback) {

  if (moment.utc(data.createdAt).isBefore(this._currTimeStepEnd)) {
    this.addMeasurementToAverage(data, callback);
  } else {
    this._idwPromises.push(this.calculateIdwForControlPoints(this.resetAverageAndReturnControlPoints(), this._currTimeStepMid));
    this.calculateNextTimeStepLimit();
    this.addMeasurementToAverage(data, callback);
  }
};

idwTransformer.prototype._flush = function (done) {
  this._idwPromises.push(this.calculateIdwForControlPoints(this.resetAverageAndReturnControlPoints(), this._currTimeStepMid));

  Promise.all(this._idwPromises)
    .then(() => {
      this.push(JSON.stringify(this._samplingGrid));
      done();
    });
};

inherits(idwTransformer, Transform);

module.exports = idwTransformer;
