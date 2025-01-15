/* eslint-disable */

db = db.getSiblingDB('OSeM-api');

// check schema version
var collections = db.getCollectionNames();

if (collections.indexOf("schemaVersion") === -1) {
  print("Error: Unkown schema version. Exiting!");
  quit();
}

var latestVersion = db.schemaVersion.find({}).sort({ schemaVersion: -1 }).limit(1).next();

if (latestVersion.schemaVersion !== 4) {
  print("Migration already applied... Exiting!");
  quit();
}

// remove old index
db.boxes.dropIndex("loc.geometry_2dsphere");

// https://github.com/sensebox/openSenseMap-API/pull/86#issuecomment-319389047
db.boxes.createIndex({ 'currentLocation': '2dsphere' }, { background: true });
db.boxes.createIndex({ 'locations.timestamp': 1 }, { background: true });

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
