'use strict';

const ss = require('simple-statistics');
const Transform = require('stream').Transform,
  inherits = require('util').inherits;

const outlier = function (outlierOptions, streamOptions) {
  if (!(this instanceof outlier)) {
    return new outlier(outlierOptions, streamOptions);
  }

  if (!streamOptions) {
    streamOptions = {};
  }
  streamOptions.decodeStrings = false;
  streamOptions.objectMode = true;

  this._values = [];
  this._window = outlierOptions._window;
  this._replaceOutlier = outlierOptions._replaceOutlier;

  Transform.call(this, streamOptions);
};

outlier.prototype._transform = function _transform (data, encoding, callback) {
  let value = parseFloat(data.value);
  if (this._values.length === this._window) {
    data.outlier = this.outlierCheck(value);
  }

  if (typeof data.outlier !== 'undefined') {
    value = this._mean;
  }

  if (this._values.length < this._window) {
    this._values.push(value);
  } else if (this._values.length === this._window) {
    this._values.shift();
    this._values.push(value);
  }

  callback(null, data);
};

outlier.prototype.outlierCheck = function outlierCheck (outlier) {
  const mad = ss.medianAbsoluteDeviation(this._values),
    median = ss.median(this._values),
    max = median + 3 * mad, //3 times medianAbsoluteDeviation around median best solution to check for outliers (see bachelor thesis JoGockel)
    min = median - 3 * mad,
    mean = ss.mean(this._values);

  if (outlier > max || outlier < min) {
    if (this._replaceOutlier) {
      outlier = mean.toString();

      return outlier;
    }

    return true;
  }
};

inherits(outlier, Transform);
module.exports = outlier;
