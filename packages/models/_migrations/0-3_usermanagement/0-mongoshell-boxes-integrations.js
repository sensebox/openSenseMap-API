/* eslint-disable */

db = db.getSiblingDB('OSeM-api');

// check schema version
var collections = db.getCollectionNames();

if (collections.indexOf("schemaVersion") === -1) {
  print("Error: Unkown schema version. Exiting!");
  quit();
}

var latestVersion = db.schemaVersion.find({}).sort({ schemaVersion: -1 }).limit(1).next();

if (latestVersion.schemaVersion !== 0) {
  print("Migration already applied... Exiting!");
  quit();
}

// move box.mqtt to box.integrations.mqtt for all boxes
db.boxes.updateMany({}, {
  $rename: { 'mqtt': 'integrations.mqtt' }
});

// disable mqtt by default for all boxes, which had no mqtt field
db.boxes.updateMany({ 'integrations.mqtt': { $exists: false } }, {
  $set: { 'integrations.mqtt': { enabled: false } }
});

db.schemaVersion.updateOne({}, { $inc: { schemaVersion: 1 }});