'use strict';

/* global describe it */

const chai = require('chai'),
  chaiHttp = require('chai-http'),
  expect = chai.expect;

chai.use(chaiHttp);

const BASE_URL = process.env.OSEM_TEST_BASE_URL;

describe('openSenseMap API CORS test', function () {
  it('should always send out CORS headers', function () {
    chai.request(BASE_URL)
      .get('/')
      .end(function (response) {
        expect(response).status(200);
        expect(response).to.have.header('access-control-allow-origin', '*');
        expect(response).to.have.header('access-control-allow-methods', 'GET, OPTIONS');
        expect(response).to.have.header('access-control-allow-headers', /authorization/i);
        expect(response).to.have.header('access-control-expose-headers', /content-disposition/i);
      });
  });

  it('should send out CORS headers for preflight requests', function () {
    chai.request(BASE_URL, { headers: { 'access-control-request-method': 'post' } })
      .options()
      .end(function (response) {
        expect(response).status(204);
        expect(response).to.have.header('access-control-allow-origin', '*');
        expect(response).to.have.header('access-control-allow-methods', 'POST, OPTIONS');
        expect(response).to.have.header('access-control-allow-headers', /authorization/i);
        expect(response).to.have.header('access-control-expose-headers', /content-disposition/i);
      });
  });
});
