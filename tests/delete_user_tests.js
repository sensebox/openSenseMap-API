'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect;

const BASE_URL = 'http://localhost:8000';

describe('openSenseMap API Delete User tests', function () {
  let jwt, num_boxes_before, num_measurements_before;

  it('should deny to delete user without jwt', function () {
    return chakram.delete(`${BASE_URL}/users/me`)
      .then(function (response) {
        expect(response).to.have.status(401);

        return chakram.get(`${BASE_URL}/stats`);
      })
      .then(function (response) {
        [ num_boxes_before, num_measurements_before ] = response.body;
      });
  });

  it('should deny to delete user without password parameter', function () {
    return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester2@test.test', password: '12345678910' })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body.token).to.be.not.empty;
        jwt = response.body.token;

        return chakram.delete(`${BASE_URL}/users/me`, {}, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(400);

        return chakram.wait();
      });
  });

  it('should deny to delete user with empty password parameter', function () {
    return chakram.delete(`${BASE_URL}/users/me`, { password: '' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(400);

        return chakram.wait();
      });
  });

  it('should deny to delete user with wrong password parameter', function () {
    return chakram.delete(`${BASE_URL}/users/me`, { password: 'wrong_password123' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(400);

        return chakram.wait();
      });
  });

  it('should allow to delete user with correct password parameter', function () {
    return chakram.delete(`${BASE_URL}/users/me`, { password: '12345678910' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);

        return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester2@test.test', password: '12345678910' });
      })
      .then(function (response) {
        expect(response).to.have.status(401);

        return chakram.get(`${BASE_URL}/stats`);
      })
      .then(function (response) {
        expect(response).status(200);
        const [ boxes, measurements ] = response.body;

        expect(boxes).to.be.less.than(num_boxes_before);
        expect(measurements).to.be.less.than(num_measurements_before);

        return chakram.wait();
      });
  });

});
