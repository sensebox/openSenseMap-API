'use strict';

const models = require('../../lib/models'),
  uuid = require('uuid'),
  moment = require('moment'),
  { mongoose, connect } = require('../../lib/db');

const { User, Box } = models;
const nameValidRegex = /^[\u00C0-\u1FFF\u2C00-\uD7FF\w-.][\u00C0-\u1FFF\u2C00-\uD7FF\w\s-.]+[\u00C0-\u1FFF\u2C00-\uD7FF\w.]$/;

const migrate = function migrate () {
  const schemaVersion = mongoose.connection.db.collection('schemaVersion');

  console.log('starting "make-users-unique" migration');

  return schemaVersion.find({})
    .next()
    .then(function (latestVersion) {
      if (latestVersion.schemaVersion !== 2) {
        throw new Error('Unexpected schema version... Exiting!');
      }

      return Box.find({}).exec();
    })
    .then(function (boxes) {
      return boxes.map(b => b._id.toString());
    })
    .then(function (boxes) {
      return User
        .find({})
        .exec()
        .then(function (users) {
          console.log(`${users.length} users found`);

          // create a hashmap with emailaddresses as keys and users as values
          const unique_users = {};

          for (const user of users) {
            // remove boxes that does not exist
            for (const box of user.boxes) {
              const index = boxes.findIndex(e => e === box.toString());

              if (index === -1) {
                console.log(`${box.toString()} does not exist. removing`);
                user.boxes.splice(index, 1);
              }
            }

            if (!(user.email in unique_users)) {
              unique_users[user.email] = [];
            }
            unique_users[user.email].push(user);
          }
          console.log(`${Object.keys(unique_users).length} unique users found`);

          // create a hashmap with user_id as key and boxids as values
          console.log('gathering boxids...');
          const users_boxids = {};
          const users_to_remove = [];
          for (const email of Object.keys(unique_users)) {
            const first_user = unique_users[email].shift();
            const uid = first_user._id.toString();
            users_boxids[uid] = [first_user.boxes[0]];

            for (const user of unique_users[email]) {
              users_to_remove.push(user);
              for (const box of user.boxes) {
                if (box !== null || typeof box !== 'undefined') {
                  users_boxids[uid].push(box);
                }
              }
            }
          }
          console.log(`${users_to_remove.length} users will be removed`);

          const promises = [];
          // set the boxes to the users
          for (const user of users) {
            if (user._id.toString() in users_boxids) {

              const oid_boxes = users_boxids[user._id.toString()]
                .filter(function (b) {
                  return b !== null || typeof b !== 'undefined';
                })
                .filter(n => n)
                .map(function (id) {
                  return mongoose.Types.ObjectId(id);
                });

              if (!nameValidRegex.test(user.name)) {
                console.log('oh weia', user.name);

                if (user.name.length < 4) {
                  let newName = user.name;
                  while (newName.length < 4) {
                    newName = `${newName}_`;
                  }
                  user.set('name', newName);
                }

                if (user.name.includes('"')) {
                  user.set('name', user.name.replace(/"/g, ''));
                }

              }

              user.set('boxes', oid_boxes);
              user.set('password', uuid());
              user.set('resetPasswordToken', uuid());
              user.set('resetPasswordExpires', moment.utc()
                .add(6, 'months')
                .toDate());

              promises.push(user.save());
            }
          }

          // delete the rest
          promises.push(User.remove({ _id: { $in: users_to_remove } }).exec());

          return Promise.all(promises)
            .then(function () {
              User.collection.createIndex({ email: 1 }, { unique: true });
              User.collection.createIndex({ name: 1 }, { unique: true });

              return User.find({}).populate('boxes')
                .exec();
            })
            .then(function (users) {
              return Promise.all(users.map(user => user.mail('newUserManagement', user.boxes)));
            })
            .then(function () {
              console.log('done');

              return schemaVersion.update({}, { '$inc': { schemaVersion: 1 } });
            });

        });
    })
    .catch(function (err) {
      console.log('Error occurred:');
      console.log(err);
    });

};

connect()
  .then(function () {
    migrate()
      .then(function () {
        mongoose.disconnect();
      })
      .catch(function (err) {
        console.error(err);
        mongoose.disconnect();
      });
  })
  .catch(function (err) {
    console.error(err);
  });
