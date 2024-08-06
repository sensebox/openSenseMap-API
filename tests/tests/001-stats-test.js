'use strict';

/* global describe it */

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

chai.use(chaiHttp);

const BASE_URL = `${process.env.OSEM_TEST_BASE_URL}`;
const options = { headers: { 'x-apicache-bypass': true } };
const ROUTE = '/stats';

describe('openSenseMap API Routes: /stats', function () {
  it('should return a json array with three numbers', function (done) {
    chai.request(BASE_URL)
      .get(ROUTE)
      .set(options.headers)
      .end(function (err, response) {
        expect(response).status(200);
        expect(response).to.have.header(
          'content-type',
          'application/json; charset=utf-8'
        );

        expect(response.body).not.empty;

        expect(Array.isArray(response.body)).true;

        expect(response.body.every((n) => typeof n === 'number')).true;

        done();
      });
  });

  it('should return a json array with three strings when called with parameter human=true', function (done) {
    chai.request(BASE_URL)
      .get(ROUTE)
      .set(options.headers)
      .query({ human: true })
      .end(function (err, response) {
        expect(response).status(200);
        expect(response).to.have.header(
          'content-type',
          'application/json; charset=utf-8'
        );

        expect(response.body).not.empty;

        expect(Array.isArray(response.body)).true;

        expect(response.body.every((n) => typeof n === 'string')).true;

        done();
      });
  });

  it('should return a json array with three numbers when called with parameter human=false', function (done) {
    chai.request(BASE_URL)
      .get(ROUTE)
      .set(options.headers)
      .query({ human: false })
      .end(function (err, response) {
        expect(response).status(200);
        expect(response).to.have.header(
          'content-type',
          'application/json; charset=utf-8'
        );

        expect(response.body).not.empty;

        expect(Array.isArray(response.body)).true;

        expect(response.body.every((n) => typeof n === 'number')).true;

        done();
      });
  });

  it('should return an error if parameter human is not true or false', function (done) {
    chai.request(BASE_URL)
      .get(ROUTE)
      .set(options.headers)
      .query({ human: 'tr' })
      .end(function (err, response) {
        expect(response).status(422);
        expect(response).to.have.header(
          'content-type',
          'application/json; charset=utf-8'
        );
        expect(response).to.be.json;
        expect(response.body).to.have.a.property('message');
        expect(response.body.message).to.equal(
          'Illegal value for parameter human. allowed values: true, false'
        );
        done();
      });
  });
});
