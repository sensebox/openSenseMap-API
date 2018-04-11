'use strict';

/* global describe it before after */

const chakram = require('chakram'),
  expect = chakram.expect,
  { User } = require('@sensebox/opensensemap-api-models');

const normalUser = {
  name: 'Hans Normal',
  email: 'hansnormal@normal.test',
  password: '12345678',
  language: 'en',
};

const adminUser = {
  ...normalUser,
  ...{ name: 'Peter Admin', role: 'admin', email: 'admin@admin.test' }
};

const MANAGEMENT_URL = `${process.env.OSEM_TEST_BASE_URL}/management`;

console.log(normalUser);
console.log(adminUser);

describe('Management Tests', function () {

  before(async function () {
    await User.create(normalUser);
    await User.create(adminUser);

    return Promise.resolve();
  });

  after(async function () {
    const normalUserDB = await User.findOne({ email: normalUser.email });
    await normalUserDB.destroyUser();

    const adminUserDB = await User.findOne({ email: adminUser.email });
    await adminUserDB.destroyUser();

    return Promise.resolve();
  });

  it('should not allow normal users to access management routes', async function () {
    const signInResponse = await chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/sign-in`, normalUser);
    const forbiddenResponse = await chakram.get(`${MANAGEMENT_URL}/boxes`, { headers: { 'Authorization': `Bearer ${signInResponse.body.token}` } });

    expect(forbiddenResponse).to.have.status(403);
  });

});
