'use strict';

const ss = require('simple-statistics');
const Transform = require('stream').Transform,
  inherits = require('util').inherits;

/**
 * @apiDefine OutlierParameters
 *
 * @apiParam {String="replace","mark"} [outliers] Specifying this parameter enables outlier calculation which adds a new field called `isOutlier` to the data. Possible values are "mark" and "replace".
 * @apiParam {Number=1-50} [outlier-window=15] Size of moving window used as base to calculate the outliers.
 */

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
  this._window = outlierOptions.window;
  this._replaceOutlier = outlierOptions.replaceOutlier;

  Transform.call(this, streamOptions);
};

outlier.prototype._transform = function _transform (data, encoding, callback) {
  data.isOutlier = 'null';

  const value = parseFloat(data.value);
  if (this._values.length === this._window) {
    data.isOutlier = this.outlierCheck(value).toString();
    if (data.isOutlier === 'true' && this._replaceOutlier === true) {
      data.value = ss.mean(this._values).toString();
    }
  }

  if (this._values.length < this._window) {
    this._values.push(value);
  } else if (this._values.length === this._window) {
    this._values.shift();
    this._values.push(value);
  }

  this.push(data);

  callback();
};

outlier.prototype.outlierCheck = function outlierCheck (outlier) {
  const median = ss.median(this._values);

  // compute the medianAbsoluteDeviation
  // The mad of nothing is null
  const medianAbsoluteDeviations = [];

  // Make a list of absolute deviations from the median
  for (let i = 0, len = this._values.length; i < len; i++) {
    medianAbsoluteDeviations.push(Math.abs(this._values[i] - median));
  }

  // Find the median value of that list
  const mad = ss.median(medianAbsoluteDeviations),
    max = median + 3 * mad, //3 times medianAbsoluteDeviation around median best solution to check for outliers (see bachelor thesis Joana Gockel)
    min = median - 3 * mad;

  return (outlier > max || outlier < min);
};

inherits(outlier, Transform);
module.exports = outlier;
