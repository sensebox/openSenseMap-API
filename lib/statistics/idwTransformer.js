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
  power: 1
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

  this._samplingGrid = grids[idwOptions.gridType](bbox(idwOptions.bbox), idwOptions.cellWidth, idwOptions.units);
  this._controlPoints = [];
  this._idwOptions = idwOptions;

  Transform.call(this, streamOptions);
};

inherits(idw, Transform);

// use transform only for collection
idw.prototype._transform = function _transform (data, encoding, callback) {
  this._controlPoints.push(data);

  callback();
};

idw.prototype._flush = function (done) {
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
      sw = sw + w;
      zw = zw + (w * this._controlPoints[j].properties.value);
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
  this.push(']}');

  done();
};

module.exports = idw;
