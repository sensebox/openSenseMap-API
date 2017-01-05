'use strict';

//drei mal fortlaufende absolute Abweichung um den fortlaufenden Median
// mean

const ss = require('simple-statistics');
const request = require('request-promise-native'); //'request'

const Transform = require('stream').Transform;

/*const myTransform = new Transform({
  transform(chunk, encoding, callback) {
    // ...
  }
});*/

const outlier = function (idwTransformerOptions, streamOptions) {
  if (!(this instanceof outlier)) {
    return new outlier(idwTransformerOptions, streamOptions);
  }

  if (!streamOptions) {
    streamOptions = {};
  }
  streamOptions.decodeStrings = false;
  streamOptions.objectMode = false;

  this._idwOptions = idwTransformerOptions;
  this._hasData = false;

  Transform.call(this, streamOptions);
};

const getMeasurements = (boxID, sensorID) => {
  const date = new Date(new Date().setFullYear(new Date().getFullYear() - 1));

  return request(`https://api.opensensemap.org/boxes/${boxID}/data/${sensorID}?${date}`);
};

outlier.prototype._transform = function _transform (data, encoding, callback) {
  if (this._hasData === false) {
    this.initVariables();
  }
  if (value > this._max || value < this._min) {
    value = this._mean;//this.addMeasurementToAverage(data, callback);
  }
};


outlier.prototype.initVariables = function initVariables () {
  return getMeasurements(boxID, sensorID)
    .then(function (response) {
      this._hasData = true;
      const json = JSON.parse(response);
      const values = json.map(function (obj) {
        const rObj = obj.value;

        return rObj;
      });
      this._mad = ss.medianAbsoluteDeviation(values);
      this._median = ss.median(values);
      this._max = this._median + 3 * this._mad;
      this._min = this._median - 3 * this._mad;
      this._mean = ss.mean(values);
    })
    .catch(function (error) {
      console.log(error);
    });
};

