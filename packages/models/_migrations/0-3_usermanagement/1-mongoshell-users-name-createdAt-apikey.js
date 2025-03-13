/* eslint-disable */

db = db.getSiblingDB('OSeM-api');

// check schema version
var collections = db.getCollectionNames();

if (collections.indexOf("schemaVersion") === -1) {
  print("Error: Unkown schema version. Exiting!");
  quit();
}

var latestVersion = db.schemaVersion.find({}).sort({ schemaVersion: -1 }).limit(1).next();

if (latestVersion.schemaVersion !== 1) {
  print("Migration already applied... Exiting!");
  quit();
}

// query all users
var cursor = db.users.aggregate([
  { '$project': {
    'name': { '$concat': [ '$firstname', ' ', '$lastname' ] }
  } }
]);

// helper for creating createdAt field
var dateFromObjectId = function (objectId) {
  return new Date(parseInt(objectId.substr(10, 24).substring(0, 8), 16) * 1000);
};

var requests = [];
// iterate users, set fields
cursor.forEach(function (document) {
  var language = 'de_DE';
  if (document.language) {
    language = document.language;
  }
  requests.push({
    'updateOne': {
      'filter': { '_id': document._id },
      'update': {
        '$set': {
          'name': document.name,
          'createdAt': dateFromObjectId(document._id.toString()),
          'role': 'user',
          'emailIsConfirmed': false,
          'language': language
        }
      }
    }
  });
  if (requests.length === 500) {
    //Execute per 500 operations and re-init
    db.users.bulkWrite(requests);
    requests = [];
  }
});

if (requests.length > 0) {
  db.users.bulkWrite(requests);
}

// remove apikey index
db.users.dropIndex('apikey_1');

// remove firstname, lastname and apikey fields
db.users.update({},
  { $unset: { firstname: true, lastname: true, apikey: true } },
  { multi: true, safe: true }
);

db.schemaVersion.updateOne({}, { $inc: { schemaVersion: 1 }});