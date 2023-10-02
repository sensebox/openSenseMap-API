'use strict';

/* global describe it */

// const chakram = require('chakram'),
//   expect = chakram.expect;

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

chai.use(chaiHttp);

const BASE_URL = process.env.OSEM_TEST_BASE_URL;

describe('openSenseMap API Routes: /', function () {
  it('should print available routes', function () {
    chai.request(BASE_URL)
      .get('/')
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header('content-type', 'text/plain; charset=utf-8');
        expect(res.body).not.null;
      });
    // return chakram.get(BASE_URL)
    //   .then(function (response) {
    //     expect(response).status(200);
    //     expect(response).to.have.header('content-type', 'text/plain; charset=utf-8');

    //     expect(response.body).not.empty;

    //     return chakram.wait();
    //   });
  });
});
