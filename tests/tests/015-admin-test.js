'use strict';

/* global describe it before after */

const chakram = require('chakram'),
  expect = chakram.expect,
  { User } = require('@sensebox/opensensemap-api-models'),
  { createToken } = require('../../packages/api/lib/helpers/jwtHelpers'),
  valid_sensebox = require('../data/valid_sensebox');

const normalUserData = {
  name: 'Hans Normal',
  email: 'hansnormal@normal.test',
  password: '12345678',
  language: 'en',
};

const adminUserData = {
  ...normalUserData,
  ...{ name: 'Peter Admin', role: 'admin', email: 'admin@admin.test' }
};

const MANAGEMENT_URL = `${process.env.OSEM_TEST_BASE_URL}/management`;

describe('Management Tests', function () {
  let normalUser, adminUser, normalUserBox, adminJwt;

  before(async function () {
    normalUser = await User.create(normalUserData);
    adminUser = await User.create(adminUserData);

    normalUserBox = await normalUser.addBox(valid_sensebox());


    const { token } = await createToken(adminUser);
    adminJwt = token;

    return Promise.resolve();
  });

  after(async function () {
    await normalUser.destroyUser();
    await adminUser.destroyUser();

    return Promise.resolve();
  });

  it('should not allow normal users to access management routes', async function () {
    const signInResponse = await chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/sign-in`, normalUser);
    const forbiddenResponse = await chakram.get(`${MANAGEMENT_URL}/boxes`, { headers: { 'Authorization': `Bearer ${signInResponse.body.token}` } });

    expect(forbiddenResponse).to.have.status(403);
  });

  const requestWithAuth = function requestWithAuth (method, url, payload) {
    if (method === 'get') {
      return chakram[method](url, { headers: { 'Authorization': `Bearer ${adminJwt}` } });
    }

    return chakram[method](url, payload, { headers: { 'Authorization': `Bearer ${adminJwt}` } });
  };

  describe('users management', function () {
    it('should allow to request a list of users with secrets', async function () {
      const { body: { users } } = await requestWithAuth('get', `${MANAGEMENT_URL}/users`);
      expect(Array.isArray(users)).true;
      for (const user of users) {
        expect(user.name).exist;
        expect(user.email).exist;
        expect(user._id).exist;
        expect(user.boxes).exist;
      }

      return chakram.wait();
    });

    it('should allow to request a user representation with secrets', async function () {
      const { body: user } = await requestWithAuth('get', `${MANAGEMENT_URL}/users/${normalUser._id}`);
      expect(user.name).exist;
      expect(user.name).equal(normalUserData.name);
      expect(user.email).exist;
      expect(user._id).exist;
      expect(user.boxes).exist;

      return chakram.wait();
    });

    it('should allow to edit boxes of any user', async function () {
      const { body: { data } } = await requestWithAuth('put', `${MANAGEMENT_URL}/users/${normalUser._id}`, { name: 'new name' });
      expect(data.name).equal('new name');

      return chakram.wait();
    });

  });

  describe('boxes management', function () {
    it('should allow to request a list of boxes with secrets', async function () {
      const { body } = await requestWithAuth('get', `${MANAGEMENT_URL}/boxes`);
      expect(Array.isArray(body)).true;

      return chakram.wait();
    });

    it('should allow to request a box representation with secrets', async function () {
      const { body } = await requestWithAuth('get', `${MANAGEMENT_URL}/boxes/${normalUserBox._id}`);
      expect(body.name).equal(valid_sensebox().name);
      expect(body.integrations).exist;

      return chakram.wait();
    });

    it('should allow to edit boxes of any user', async function () {
      const { body: { data } } = await requestWithAuth('put', `${MANAGEMENT_URL}/boxes/${normalUserBox._id}`, { name: 'new name' });
      expect(data.name).equal('new name');

      return chakram.wait();
    });

  });

  describe('deletion', function () {

    it('should allow to delete boxes of any user', async function () {
      const boxesToDelete = { boxIds: [normalUserBox._id.toString()] };
      const { body } = await requestWithAuth('post', `${MANAGEMENT_URL}/boxes/delete`, boxesToDelete);
      expect(body).deep.equal(boxesToDelete);

      return chakram.wait();
    });

    it('should allow to delete users', async function () {
      const usersToDelete = { userIds: [normalUser._id.toString()] };
      const { body } = await requestWithAuth('post', `${MANAGEMENT_URL}/users/delete`, usersToDelete);
      expect(body).deep.equal(usersToDelete);

      return chakram.wait();
    });

  });

});
