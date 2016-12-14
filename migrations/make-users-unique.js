'use strict';

const utils = require('../lib/utils'),
  models = require('../lib/models');

const { User, Box } = models;

// TODO: drop unique index on apikey
// TODO: remove apikey field https://team.goodeggs.com/how-to-remove-a-property-from-a-mongoose-js-schema-1947330c6974#.d3sk59hlz
// TODO: remove required property from lastname
// TODO: switch to reference of boxes instead of box id strings
// TODO: reset passwords for all users -> email with password reset link

utils.connectWithRetry(function () {
  console.log('starting "make-users-unique" migration');
  User
    .find({})
    .exec()
    .then(function (users) {
      console.log(`${users.length} users found`);

      // create a hashmap with emailaddresses as keys and users as values
      const unique_users = {};

      for (const user of users) {
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
          users_boxids[uid].push(user.boxes[0]);
        }
      }
      console.log(`${users_to_remove.length} will be removed`);

      const promises = [];
      // set the boxes to the users
      for (const user of users) {
        if (user._id.toString() in users_boxids) {
          promises.push(user.set('boxes', users_boxids[user._id.toString()]).save());
        }
      }

      // delete the rest
      promises.push(User.remove({ _id: { $in: users_to_remove } }).exec());

      Promise.all(promises)
        .then(function () {
          console.log('done');
        });

    });
});
