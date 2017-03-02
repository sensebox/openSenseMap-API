//var db = Mongo().getDB("OSeM-api");

var boxIter = db.boxes.find(),
  // stack all operation in bulks, and execute them at the end.
  boxesBulk = db.boxes.initializeUnorderedBulkOp(),
  measurementsBulk = db.measurements.initializeUnorderedBulkOp(),
  locationsBulk = db.locations.initializeUnorderedBulkOp();

// process each box
while (boxIter.hasNext()) {

  var box = boxIter.next(),
    sensorIds = box.sensors.map(s => s._id),
    locationId = ObjectId();

  if (!box.loc || box.location) {
    continue;
  }

  // create location for box
  locationsBulk.insert({
    _id: locationId,
    box: box._id,
    timestamp: box._id.getTimestamp(),
    location: box.loc[0].geometry
  });

  // update location ref in box
  boxesBulk.find({
    _id: box._id
  }).update({
    $unset: { type: '', loc: '' },
    $set:   { location: locationId }
  });

  // add location refs for all measurements of box
  measurementsBulk.find({
    sensor_id: {$in: sensorIds}
  }).update({ $set: { location: locationId } })
}

locationsBulk.execute();
boxesBulk.execute();
measurementsBulk.execute();
