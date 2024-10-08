/* eslint-disable */
"use strict";

const models = require("../../../models");
const { mongoose, connect } = models.db;
const { Box } = models;

const migrate = function migrate() {
  const schemaVersion = mongoose.connection.db.collection("schemaVersion");

  console.log('Starting "fix corrupt sensors" migration');

  return schemaVersion
    .find({})
    .next()
    .then(function (latestVersion) {
      if (latestVersion.schemaVersion !== 8) {
        throw new Error("Unexpected schema version... Exiting!");
      }

      return Box.find({ "sensors" : {$elemMatch: { title : { $exists: false }}}}).exec();
    })
    .then(function (boxes) {
      console.log("Found boxes: ", boxes.length)
      const promises = [];
      for (let index = 0; index < boxes.length; index++) {
        const box = boxes[index];

        let sensors = box.sensors.filter(sensor => {
          if(sensor.title && sensor.unit){
            return true;
          } else {
            return false;
          }
        })
        box.set("sensors", sensors);
        promises.push(box.save());
      }

      return Promise.all(promises).then(function () {
        console.log("Migration done!");

        return schemaVersion.update({}, { $inc: { schemaVersion: 1 } });
      });
    });
};

// Connect to db and run migration
connect()
  .then(function () {
    migrate()
      .then(function () {
        mongoose.disconnect();
      })
      .catch(function (err) {
        console.log(err);
        mongoose.disconnect();
      });
  })
  .catch(function (err) {
    console.log(err);
  });
