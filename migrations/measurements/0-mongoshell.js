/* eslint-disable */
db = db.getSiblingDB('OSeM-api');

var cursor = db.measurements.find().sort({ createdAt: -1 });

var requests = [];
// iterate measurements, set and unset fields
cursor.forEach(function (document) {
  requests.push({
    'updateOne': {
      'filter': { '_id': document._id },
      'update': {
        '$set': {
          'value': parseFloat(document.value)
        },
        '$unset': {
          'updatedAt': ''
        }
      }
    }
  });
  if (requests.length === 500) {
    //Execute per 500 operations and re-init
    db.measurements.bulkWrite(requests);
    requests = [];
  }
});

if (requests.length > 0) {
  db.measurements.bulkWrite(requests);
}

// set lastMeasurements of boxes

var cursor = db.boxes.find();
var boxesBulk = db.boxes.initializeUnorderedBulkOp()

while (cursor.hasNext()) {
  var box = cursor.next();

  var sensors = box.sensors.map(function (sensor) {
    var lastMeasurement = db.measurements.find({ sensor_id: sensor._id }, { _id: 0, createdAt: 1, value: 1 })
      .sort({createdAt: -1})
      .limit(1)
      .toArray();

    if (lastMeasurement && lastMeasurement[0]) {
      sensor.lastMeasurement = lastMeasurement[0];
    }

    return sensor;
  });

  boxesBulk.find({ _id: box._id })
    .update({ '$set': { sensors: sensors } });
}

boxesBulk.execute();
