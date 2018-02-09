'use strict';

/* global describe it */
const { db: { connect, mongoose } } = require('@sensebox/opensensemap-api-models');

describe('waiting for initialization', function () {
  it('waits for database ready', function (done) {
    this.timeout(10000);
    connect()
      .then(function success () {
        mongoose.disconnect();
        done();
      });
  });
});
