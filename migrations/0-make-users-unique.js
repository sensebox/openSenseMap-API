'use strict';

const models = require('../lib/models'),
  uuid = require('uuid'),
  moment = require('moment'),
  mongoose = require('mongoose');

const { User, Box } = models;

module.exports = function () {
  console.log('starting "make-users-unique" migration');

  console.log('removing unique index on apikey');

  return User.collection.dropIndex('apikey_1')
    .then(function () {
      console.log('removing apikey from users');

      return User.collection.update({},
        { $unset: { apikey: true } },
        { multi: true, safe: true }
      );
    })
    .then(function () {
      return Box.find({})
        .exec()
        .then(function (boxes) {
          return boxes.map(b => b._id.toString());
        });
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
          console.log(`${users_to_remove.length} will be removed`);


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

              let lang = user.language;
              if (typeof lang === 'undefined') {
                lang = 'de_DE';
              }

              user.set('name', `${user.firstname} ${user.lastname}`);
              user.set('boxes', oid_boxes);
              user.set('password', uuid());
              user.set('language', lang);
              user.set('resetPasswordExpires', moment.utc()
                .add(2, 'months')
                .toDate());

              promises.push(user.save());
            }
          }

          // delete the rest
          promises.push(User.remove({ _id: { $in: users_to_remove } }).exec());

          return Promise.all(promises)
            .then(function () {
              return User.collection.update({},
                { $unset: { firstname: true, lastname: true } },
                { multi: true, safe: true }
              );
            })
            .then(function () {
              console.log('done');

              return User.find({}).populate('boxes')
                .exec();
            })
            .then(function (users) {
              JSON.stringify(users.map(u => u.toJSON()));
              for (const user of users) {
                user.mail('newUserManagement', user.boxes);
              }
            });

        });
    })
    .catch(function (err) {
      console.log('Error occurred:');
      console.log(err);
    });

};
