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

// helper for creating createdAt field
var dateFromObjectId = function (objectId) {
  return new Date(parseInt(objectId.substr(10, 24).substring(0, 8), 16) * 1000);
};

// remove unused orderID field
db.boxes.updateMany({ orderID: { $exists: true }}, { $unset: { orderID: "" } });

// fill mising exposure required fields with 'unknown'
db.boxes.updateMany({ $or: [ { exposure: { $exists: false } } , { exposure: "" } ] }, { $set: { exposure: "unknown" } });

// set missing createdAt field
var boxesBulk = db.boxes.initializeUnorderedBulkOp();
var cursor = db.boxes.find({});
while (cursor.hasNext()) {
  var box = cursor.next();

  var updateQuery = {};

  if (!box.createdAt) {
    if (!updateQuery['$set']) {
      updateQuery['$set'] = {};
    }
    updateQuery['$set']['createdAt'] = dateFromObjectId(box._id.toString());
  }

  if (typeof box.model === 'undefined' || box.model === '') {
    if (!updateQuery['$set']) {
      updateQuery['$set'] = {};
    }
    updateQuery['$set']['model'] = 'custom';
  }

  if (box.grouptag === '') {
    if (!updateQuery['$unset']) {
      updateQuery['$unset'] = {};
    }
    updateQuery['$unset']['grouptag'] = ''
  }

  if (updateQuery['$set'] || updateQuery['$unset']) {
    boxesBulk.find({
      _id: box._id
    }).update(updateQuery);
  }
}
boxesBulk.execute();

db.schemaVersion.updateOne({}, { $inc: { schemaVersion: 1 }});