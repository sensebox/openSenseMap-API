'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect;

const BASE_URL = process.env.OSEM_TEST_BASE_URL;

describe('openSenseMap API CORS test', function () {
  it('should always send out CORS headers', function () {
    return chakram.get(BASE_URL)
      .then(function (response) {
        expect(response).status(200);
        expect(response).to.have.header('access-control-allow-origin', '*');
        expect(response).to.have.header('access-control-allow-methods', 'GET, OPTIONS');
        expect(response).to.have.header('access-control-allow-headers', /authorization/i);

        return chakram.wait();
      });
  });

  it('should send out CORS headers for preflight requests', function () {
    return chakram.options(BASE_URL, { headers: { 'access-control-request-method': 'post' } })
      .then(function (response) {
        expect(response).status(204);
        expect(response).to.have.header('access-control-allow-origin', '*');
        expect(response).to.have.header('access-control-allow-methods', 'POST, OPTIONS');
        expect(response).to.have.header('access-control-allow-headers', /authorization/i);

        return chakram.wait();
      });
  });
});
