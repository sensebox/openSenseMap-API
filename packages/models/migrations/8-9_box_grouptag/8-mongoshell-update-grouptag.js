/* eslint-disable */

db = db.getSiblingDB("OSeM-api");

// check schema version
var collections = db.getCollectionNames();

if (collections.indexOf("schemaVersion") === -1) {
  print("Error: Unkown schema version. Exiting!");
  quit();
}

var latestVersion = db.schemaVersion.find({}).sort({ schemaVersion: -1 }).limit(1).next();

if (latestVersion.schemaVersion !== 8) {
  print("Migration already applied... Exiting!");
  quit();
}

db.boxes.updateMany(
  {},
  [{ $set: { grouptag: ["$grouptag"] } }],
  { multi: true }
);

db.schemaVersion.updateOne({}, { $inc: { schemaVersion: 1 } });