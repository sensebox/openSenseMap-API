/* eslint-disable */
"use strict";

const models = require("../../../models");
const { mongoose, connect } = models.db;
const { Box } = models;
const crypto = require('crypto')

const migrate = function migrate() {
  const schemaVersion = mongoose.connection.db.collection("schemaVersion");

  console.log('Starting "update access token" migration');

  return schemaVersion
    .find({})
    .next()
    .then(function (latestVersion) {
      if (latestVersion.schemaVersion !== 7) {
        throw new Error("Unexpected schema version... Exiting!");
      }

      return Box.find({access_token: {$exists: false}}).exec();
    })
    .then(function (boxes) {
      const promises = [];
      for (let index = 0; index < boxes.length; index++) {
        const box = boxes[index];

        box.set("access_token", crypto.randomBytes(32).toString('hex'));
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
