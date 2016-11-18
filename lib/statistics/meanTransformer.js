
'use strict';

const Transform = require('stream').Transform,
  inherits = require('util').inherits,
  point = require('@turf/helpers').point;

const meanTransformer = function (streamOptions) {
  if (!(this instanceof meanTransformer)) {
    return new meanTransformer(streamOptions);
  }

  if (!streamOptions) {
    streamOptions = {};
  }
  streamOptions.decodeStrings = false;
  streamOptions.objectMode = true;

  // variables for average
  this._ct = 0;
  this._avg;
  this._currSensorId;
  // used for geojson feature
  this._geom;

  Transform.call(this, streamOptions);
};

inherits(meanTransformer, Transform);

meanTransformer.prototype._transform = function _transform (data, encoding, callback) {

  if (this._currSensorId !== data.sensorId) {
    if (this._avg) {
      this._geom.properties.value = this._avg;
      this.push(this._geom);
    }
    this._currSensorId = data.sensorId;
    this._avg = parseFloat(data.value);
    this._ct = 0;
    this._geom = point([data.lng, data.lat]);
  } else {
    this._ct = this._ct + 1;
    // average
    this._avg = (
      ((this._avg * this._ct) + parseFloat(data.value)) /
      (this._ct + 1)
     );
  }

  callback();
};

meanTransformer.prototype._flush = function (done) {
  if (this._avg) {
    this._geom.properties.value = this._avg;
    this.push(this._geom);
  }
  done();
};

module.exports = meanTransformer;
