'use strict';

const Transform = require('stream').Transform,
  inherits = require('util').inherits,
  point = require('@turf/helpers').point,
  distance = require('@turf/distance').default,
  /* eslint-disable global-require */
  grids = {
    'hex': require('@turf/hex-grid').default,
    'square': require('@turf/square-grid').default,
    'triangle': require('@turf/triangle-grid').default,
  },
  /* eslint-enable global-require */
  centroid = require('@turf/centroid').default,
  bbox = require('@turf/bbox').default;

const idwTransformer = function (idwTransformerOptions, streamOptions) {
  if (!(this instanceof idwTransformer)) {
    return new idwTransformer(idwTransformerOptions, streamOptions);
  }

  if (!streamOptions) {
    streamOptions = {};
  }
  streamOptions.decodeStrings = false;
  streamOptions.objectMode = true;

  this._idwOptions = idwTransformerOptions;
  this._hasData = false;

  Transform.call(this, streamOptions);
};

idwTransformer.prototype.initVariables = function initVariables () {
  this._hasData = true;

  // variables for average
  this._averages = {};

  this._samplingGrid = grids[this._idwOptions.gridType](bbox(this._idwOptions.bbox), this._idwOptions.cellWidth, 'kilometers');
  this._samplingGridN = this._samplingGrid.features.length;
  this._samplingGridCentroids = [];
  for (const cell of this._samplingGrid.features) {
    this._samplingGridCentroids.push(centroid(cell));
    cell.properties.idwValues = [];
  }
  this._idwPromises = [];

  // calculate timeSteps
  this._diffTimeSteps = this._idwOptions.toDate.diff(this._idwOptions.fromDate);
  this._diffTimeSteps = this._diffTimeSteps / (this._idwOptions.numTimeSteps);

  // calculate the first timestep limit
  this._currTimeStepStart = this._idwOptions.fromDate;
  this._currTimeStepMid = this._currTimeStepStart.clone();
  this._currTimeStepMid.add(this._diffTimeSteps / 2, 'milliseconds');
  this._currTimeStepEnd = this._currTimeStepStart.clone().add(this._diffTimeSteps, 'milliseconds');

  // array for timestepsStorage
  this._timeSteps = [];

  // for breaks
  this._idwOptions.numClasses = this._idwOptions.numClasses - 1;

  this._min = Number.MAX_SAFE_INTEGER;
  this._max = Number.MIN_SAFE_INTEGER;
};

idwTransformer.prototype.calculateNextTimeStepLimit = function calculateNextTimeStepLimit () {
  this._currTimeStepMid = this._currTimeStepStart.clone().add(this._diffTimeSteps / 2);
  this._timeSteps.push(this._currTimeStepMid.toISOString());
  this._currTimeStepEnd.add(this._diffTimeSteps);
  this._currTimeStepStart.add(this._diffTimeSteps);
};

/**
 * Object.values polyfill REMOVE ME when we switch to a higher node version
 */

if (!Object.values) {
  const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
  const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
  const concat = Function.bind.call(Function.call, Array.prototype.concat);
  const keys = Reflect.ownKeys;
  Object.values = function values (O) {
    return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
  };
}

idwTransformer.prototype.resetAverageAndReturnControlPoints = function resetAverageAndReturnControlPoints () {
  const controlPoints = Object.values(this._averages).map(a => a.geom);

  this._averages = {};

  return controlPoints;
};

idwTransformer.prototype.addMeasurementToAverage = function addMeasurementToAverage (measurement, cb) {
  const value = measurement.value;

  // for breaks
  if (value < this._min) {
    this._min = value;
  }

  if (value > this._max) {
    this._max = value;
  }

  if (!Object.keys(this._averages).includes(measurement.sensorId)) {
    this._averages[measurement.sensorId] = {
      count: 0,
      geom: point([measurement.lon, measurement.lat], { average: value })
    };

    return cb();
  }

  const avg = this._averages[measurement.sensorId];

  avg.count = avg.count + 1;
  avg.geom.properties.average = (
    ((avg.geom.properties.average * avg.count) + value) /
    (avg.count + 1)
  );

  cb();
};

idwTransformer.prototype.calculateIdwForControlPoints = function calculateIdwForControlPoints (controlPoints) {
  // calculate idw
  const controlPointsLen = controlPoints.length;
  for (let i = 0; i < this._samplingGridN; i++) {
    let zw = 0;
    let sw = 0;
    // calculate the distance from each control point to cell's centroid
    for (let j = 0; j < controlPointsLen; j++) {
      const d = distance(this._samplingGridCentroids[i], controlPoints[j], 'kilometers');
      if (d === 0) {
        zw = controlPoints[j].properties.average;
      }
      const w = 1.0 / Math.pow(d, this._idwOptions.power);
      sw = sw + w;
      zw = zw + (w * controlPoints[j].properties.average);
    }

    // write IDW value for each grid cell
    this._samplingGrid.features[i].properties.idwValues.push(zw / sw);
  }

  return Promise.resolve();
};

idwTransformer.prototype._transform = function _transform (data, encoding, callback) {
  if (this._hasData === false) {
    this.initVariables();
  }
  if (data.createdAt.isBefore(this._currTimeStepEnd)) {
    this.addMeasurementToAverage(data, callback);
  } else {
    this._idwPromises.push(this.calculateIdwForControlPoints(this.resetAverageAndReturnControlPoints()));
    this.calculateNextTimeStepLimit();
    this.addMeasurementToAverage(data, callback);
  }
};

idwTransformer.prototype.pushBreaksToStream = function pushBreaksToStream () {
  this.push('{"code":"Ok","data":{"breaks":[');
  // calculate breaks
  // taken from simple-statistics
  this.push(this._min.toString());
  this.push(',');

  const breakSize = (this._max - this._min) / this._idwOptions.numClasses;

  for (let i = 1; i < this._idwOptions.numClasses; i++) {
    this.push((this._min + breakSize * i).toString());
    this.push(',');
  }

  this.push(this._max.toString());

  this.push('],"featureCollection":');
};

idwTransformer.prototype._flush = async function (done) {
  if (this._hasData === false) {
    this.push('{"code":"NotFound","message":"no measurements found"}');
    done();
  } else {
    this.pushBreaksToStream();

    this._idwPromises.push(this.calculateIdwForControlPoints(this.resetAverageAndReturnControlPoints()));

    await Promise.all(this._idwPromises);
    this.push(JSON.stringify(this._samplingGrid));
    // push timesteps to stream and close the json
    this._timeSteps.push(this._currTimeStepStart.add(this._diffTimeSteps / 2).toISOString());
    this.push(`,"timesteps":["${this._timeSteps.join('","')}"]}}`);
    done();
  }
};

inherits(idwTransformer, Transform);

module.exports = idwTransformer;
