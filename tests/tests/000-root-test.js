'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect;

const BASE_URL = process.env.OSEM_TEST_BASE_URL;

describe('openSenseMap API Routes: /', function () {
  it('should print available routes', function () {
    return chakram.get(BASE_URL)
      .then(function (response) {
        expect(response).status(200);
        expect(response).to.have.header('content-type', 'text/plain; charset=utf-8');

        expect(response.body).not.empty;

        return chakram.wait();
      });
  });
});
