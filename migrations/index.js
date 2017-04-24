'use strict';

const { connect, mongoose } = require('../lib/db');

const makeUsersUnique = require('./1-node-make-users-unique');

connect().then(function () {
  makeUsersUnique()
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
