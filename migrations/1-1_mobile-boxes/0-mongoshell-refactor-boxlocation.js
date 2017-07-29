/* eslint-disable */

db = db.getSiblingDB('OSeM-api');

// check schema version
var collections = db.getCollectionNames();

if (collections.indexOf("schemaVersion") === -1) {
  print("Error: Unkown schema version. Exiting!");
  quit();
}

var latestVersion = db.schemaVersion.find({}).sort({ schemaVersion: -1 }).limit(1).next();

if (latestVersion.schemaVersion !== 3) {
  print("Migration already applied... Exiting!");
  quit();
}

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

db.schemaVersion.updateOne({}, { $inc: { schemaVersion: 1 }});
