'use strict';

const json_obj = function (sensors) {
  const obj = {};
  sensors.forEach(function (sensor, index) {
    obj[sensor._id] = index;
  });

  return obj;
};

const json_arr = function (sensors) {
  return sensors.map(function (sensor, index) {
    return {
      sensor: sensor._id,
      value: index
    };
  });
};

module.exports = {
  json_obj,
  json_arr
};
