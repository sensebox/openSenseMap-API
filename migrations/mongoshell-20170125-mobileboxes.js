var boxIter = db.boxes.find(),
  // stack all operations in bulks, and execute them at the end.
  boxesBulk = db.boxes.initializeUnorderedBulkOp();

// process each box
while (boxIter.hasNext()) {

  var box = boxIter.next();

  var location = box.loc[0].geometry;
  location.timestamp = box._id.getTimestamp();

  if (!box.loc && box.currentLocation) {
    continue;
  }

  // update location ref in box
  boxesBulk.find({
    _id: box._id
  }).update({
    $unset: { boxType: '', loc: '' },
    $set: { currentLocation: location, locations: [location] }
  });
}

boxesBulk.execute();
