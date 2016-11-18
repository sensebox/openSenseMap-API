'use strict';

const Transform = require('stream').Transform,
  inherits = require('util').inherits,
  distance = require('@turf/distance'),
  /* eslint-disable global-require */
  grids = {
    'hex': require('@turf/hex-grid'),
    'square': require('@turf/square-grid'),
    'triangle': require('@turf/triangle-grid'),
  },
  /* eslint-enable global-require */
  centroid = require('@turf/centroid'),
  bbox = require('@turf/bbox');

const DEFAULT_IDW_OPTS = {
  gridType: 'hex',
  cellWidth: 50,
  cellUnit: 'kilometers',
  power: 1,
  numClasses: 6
};

// micro optimizaton..
const pow = function (num, p) {
  let result = num;
  while (--p) {
    result = result * num;
  }

  return result;
};

const idw = function (idwOptions, streamOptions) {
  if (!(this instanceof idw)) {
    return new idw(idwOptions, streamOptions);
  }

  if (!streamOptions) {
    streamOptions = {};
  }
  streamOptions.objectMode = true;
  streamOptions.decodeStrings = false;
  this._isFirst = true; // used for prepending featureCollection

  if (!idwOptions) {
    idwOptions = {};
    idwOptions = Object.assign(idwOptions, DEFAULT_IDW_OPTS);
  }

  this._samplingGrid = grids[idwOptions.gridType](bbox(idwOptions.bounds), idwOptions.cellWidth, idwOptions.units);
  this._controlPoints = [];
  this._idwOptions = idwOptions;

  this._idwOptions.numClasses = this._idwOptions.numClasses - 1;

  this._min = Number.MAX_SAFE_INTEGER;
  this._max = Number.MIN_SAFE_INTEGER;

  Transform.call(this, streamOptions);
};

inherits(idw, Transform);

// use transform only for collection
idw.prototype._transform = function _transform (data, encoding, callback) {
  this._controlPoints.push(data);

  if (data.properties.value < this._min) {
    this._min = data.properties.value;
  }

  if (data.properties.value > this._max) {
    this._max = data.properties.value;
  }

  callback();
};

idw.prototype._flush = function (done) {
  this.push('{"breaks": [');
  // calculate breaks
  // taken from simple-statistics
  this.push(this._min.toString());
  this.push(',');

  let breakSize = (this._max - this._min) / this._idwOptions.numClasses;

  for (var i = 1; i < this._idwOptions.numClasses; i++) {
    this.push((this._min + breakSize * i).toString());
    this.push(',');
  }

  this.push(this._max.toString());

  this.push('],"featureCollection":');

  // calculate idw
  let isFirst = true;
  const N = this._samplingGrid.features.length;
  for (let i = 0; i < N; i++) {
    let zw = 0;
    let sw = 0;
    // calculate the distance from each control point to cell's centroid
    for (let j = 0; j < this._controlPoints.length; j++) {
      const d = distance(centroid(this._samplingGrid.features[i]), this._controlPoints[j], this._idwOptions.cellUnit);
      if (d === 0) {
        zw = this._controlPoints[j].properties.value;
      }
      const w = 1.0 / pow(d, this._idwOptions.power);
      sw += w;
      zw += w * this._controlPoints[j].properties.value;
    }
    if (isFirst === true) {
      this.push('{"type":"FeatureCollection","features":[');
      isFirst = false;
    } else {
      this.push(',');
    }
    // write IDW value for each grid cell
    this._samplingGrid.features[i].properties.z = zw / sw;
    this.push(JSON.stringify(this._samplingGrid.features[i]));
  }
  this.push(']}}');

  done();
};

module.exports = idw;
