//var db = Mongo().getDB("OSeM-api");

// move box.mqtt to box.integrations.mqtt for all boxes
db.boxes.updateMany({}, {
  $rename: { 'mqtt': 'integrations.mqtt' }
});

// disable mqtt by default for all boxes, which had no mqtt field
db.boxes.updateMany({ 'integrations.mqtt': { $exists: false }}, {
  $set: { 'integrations.mqtt': { enabled: false }}
});

// migrate to simplified TTN schema
db.boxes.updateMany({}, {
  $unset: { 'integrations.ttn.messageFormat': '' },
  $rename: { 'integrations.ttn.decodeOptions.profile': 'integrations.ttn.profile' },
  $rename: { 'integrations.ttn.decodeOptions.byteMask': 'integrations.ttn.decodeOptions' }
});
