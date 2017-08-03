'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect,
  valid_sensebox = require('../data/valid_sensebox'),
  valid_user = require('../data/valid_user'),
  getUserSchema = require('../data/getUserSchema');

const BASE_URL = process.env.OSEM_TEST_BASE_URL;

describe('openSenseMap API Routes: /users', function () {
  let jwt, refreshToken;
  it('should allow to register an user via POST', function () {
    return chakram.post(`${BASE_URL}/users/register`, valid_user)
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;

        return chakram.wait();
      });
  });

  it('should deny to register an user with the same email', function () {
    return chakram.post(`${BASE_URL}/users/register`, valid_user)
      .then(function (response) {
        expect(response).to.have.status(400);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should deny to register an user with too short password', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: 'tester', password: 'short', email: 'address@email.com' })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should deny to register an user with no name', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: '', password: 'longenough', email: 'address@email.com' })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should deny to register an user with missing name parameter', function () {
    return chakram.post(`${BASE_URL}/users/register`, { password: 'longenough', email: 'address@email.com' })
      .then(function (response) {
        expect(response).to.have.status(400);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should deny to register an user with invalid email address', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: 'tester mc testmann', password: 'longenough', email: 'invalid' })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should deny to register a too short username', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: 't', password: 'longenough', email: 'address@email.com' })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should deny to register an user with username not starting with a letter or number', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: ' username', password: 'longenough', email: 'address@email.com' })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should deny to register an user with username with invalid characters', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: 'user () name', password: 'longenough', email: 'address@email.com' })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });


  it('should deny to register a too long username', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: 'Really Long User Name which is definetely too long to be accepted', password: 'longenough', email: 'address@email.com' })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should allow to register a second user via POST', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: 'mrtest', email: 'tester2@test.test', password: '12345678' })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;

        jwt = response.body.token;
        refreshToken = response.body.refreshToken;

        return chakram.wait();
      });
  });

  it('should deny to change email and password at the same time', function () {
    return chakram.put(`${BASE_URL}/users/me`, { email: 'new-email@email.www', newPassword: '87654321' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(400);
        expect(response).to.have.json('message', 'You cannot change your email address and password in the same request.');

        return chakram.wait();
      });
  });

  it('should deny to change email without current passsword', function () {
    return chakram.put(`${BASE_URL}/users/me`, { email: 'new-email@email.www' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(400);
        expect(response).to.have.json('message', 'To change your password or email address, please supply your current password.');

        return chakram.wait();
      });
  });

  it('should deny to change email with wrong current passsword', function () {
    return chakram.put(`${BASE_URL}/users/me`, { email: 'new-email@email.www', currentPassword: 'wrongpassword' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(403);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('message', 'Password incorrect');

        return chakram.wait();
      });
  });

  it('should allow to change email with correct current passsword', function () {
    return chakram.put(`${BASE_URL}/users/me`, { email: 'new-email@email.www', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json('message', 'User successfully saved. E-Mail changed. Please confirm your new address. Until confirmation, sign in using your old address');

        return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json('data', function (data) {
          expect(data.me.email).to.equal('tester2@test.test');
        });

        return chakram.wait();
      });
  });

  it('should allow to change name', function () {
    return chakram.put(`${BASE_URL}/users/me`, { name: 'new Name' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json('message', 'User successfully saved.');

        return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json('data', function (data) {
          expect(data.me.name).to.equal('new Name');
        });

        return chakram.wait();
      });
  });

  it('should deny to change name to existing name', function () {
    return chakram.put(`${BASE_URL}/users/me`, { name: 'this is just a nickname', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(400);
        expect(response).to.have.json('message', 'Duplicate user detected');

        return chakram.wait();
      });
  });

  it('should deny to change password with too short new password', function () {
    return chakram.put(`${BASE_URL}/users/me`, { newPassword: 'short', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(400);
        expect(response).to.have.json('message', 'New password should have at least 8 characters');

        return chakram.wait();
      });
  });

  it('should deny to change email to invalid email', function () {
    return chakram.put(`${BASE_URL}/users/me`, { email: 'invalid email', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(422);

        return chakram.wait();
      });
  });

  it('should deny to change name to invalid name', function () {
    return chakram.put(`${BASE_URL}/users/me`, { name: ' invalid name', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(422);

        return chakram.wait();
      });
  });

  it('should allow to change to a password with leading and trailing spaces', function () {
    return chakram.put(`${BASE_URL}/users/me`, { newPassword: ' leading and trailing spaces ', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json('message', 'User successfully saved. Password changed. Please log in with your new password');

        // try to log in with old token
        return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(401);

        // try to sign in with new password
        return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester2@test.test', password: ' leading and trailing spaces ' });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json('data', function (data) {
          expect(data.user.email).to.equal('tester2@test.test');
        });
        expect(response.body.token).to.exist;

        jwt = response.body.token;

        return chakram.wait();
      });
  });

  it('should allow to change password with correct current password', function () {
    return chakram.put(`${BASE_URL}/users/me`, { newPassword: '12345678910', currentPassword: ' leading and trailing spaces ' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json('message', 'User successfully saved. Password changed. Please log in with your new password');

        // try to log in with old token
        return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(401);

        // try to sign in with new password
        return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester2@test.test', password: '12345678910' });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json('data', function (data) {
          expect(data.user.email).to.equal('tester2@test.test');
        });
        expect(response.body.token).to.exist;

        jwt = response.body.token;

        return chakram.wait();
      });
  });

  it('should deny to request a fresh jwt using refresh token after changing the password', function () {
    return chakram.post(`${BASE_URL}/users/refresh-auth`, { 'token': refreshToken })
      .then(function (response) {
        expect(response).to.have.status(403);

        return chakram.wait();
      });
  });

  it('should deny to sign in with wrong password', function () {
    return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester@test.test', password: 'wrong password' })
      .then(function (response) {
        expect(response).to.have.status(401);

        return chakram.wait();
      });
  });

  it('should allow to sign in an user with email and password', function () {
    return chakram.post(`${BASE_URL}/users/sign-in`, valid_user)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        expect(response.body.refreshToken).to.exist;

        return chakram.wait();
      });
  });

  it('should allow to sign in an user with name and password', function () {
    return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'this is just a nickname', password: 'some secure password' })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        expect(response.body.refreshToken).to.exist;

        jwt = response.body.token;
        refreshToken = response.body.refreshToken;

        return chakram.wait();
      });
  });

  it('should allow to sign in an user with email (different case) and password', function () {
    return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'TESTER@TEST.TEST', password: 'some secure password' })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        expect(response.body.refreshToken).to.exist;

        return chakram.wait();
      });
  });

  it('should deny to sign in with name in different case', function () {
    return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'This Is Just A Nickname', password: 'some secure password' })
      .then(function (response) {
        expect(response).to.have.status(401);

        return chakram.wait();
      });
  });

  it('should allow to sign out with jwt', function () {
    return chakram.post(`${BASE_URL}/users/sign-out`, {}, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });

  it('should deny to use the refreshToken after signing out', function () {
    return chakram.post(`${BASE_URL}/users/refresh-auth`, { 'token': refreshToken })
      .then(function (response) {
        expect(response).to.have.status(403);

        return chakram.wait();
      });
  });

  it('should deny to use revoked jwt', function () {
    return chakram.post(`${BASE_URL}/boxes`, valid_sensebox(), { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(401);

        return chakram.post(`${BASE_URL}/users/sign-in`, valid_user);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        expect(response.body.refreshToken).to.exist;

        jwt = response.body.token;
        refreshToken = response.body.refreshToken;

        return chakram.wait();
      });
  });

  it('should allow to refresh jwt using the refresh token', function () {
    return chakram.post(`${BASE_URL}/users/refresh-auth`, { 'token': refreshToken })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        expect(response.body.refreshToken).to.exist;

        const jwt = response.body.token;

        return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(getUserSchema);
        expect(response).to.comprise.of.json({ code: 'Ok', data: { me: { email: 'tester@test.test' } } });

        return chakram.wait();
      });
  });

  it('should deny to use an refresh token twice', function () {
    return chakram.post(`${BASE_URL}/users/refresh-auth`, { 'token': refreshToken })
      .then(function (response) {
        expect(response).to.have.status(403);

        return chakram.wait();
      });
  });

  it('should deny to use an old jwt after using a refresh token', function () {
    return chakram.post(`${BASE_URL}/boxes`, valid_sensebox(), { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(401);

        return chakram.post(`${BASE_URL}/users/sign-in`, valid_user);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        expect(response.body.refreshToken).to.exist;

        jwt = response.body.token;
        refreshToken = response.body.refreshToken;

        return chakram.wait();
      });
  });

  it('should allow to request a password reset token', function () {
    return chakram.post(`${BASE_URL}/users/request-password-reset`, valid_user)
      .then(function (response) {
        expect(response).to.have.status(200);

        return chakram.wait();
      });
  });

  it('should deny password request with wrong token', function () {
    return chakram.post(`${BASE_URL}/users/password-reset`, { password: 'ignored_anyway', token: 'invalid_password-reset_token', email: 'tester@test.test' })
      .then(function (response) {
        expect(response).to.have.status(403);
        expect(response).to.have.json({ code: 'ForbiddenError',
          message: 'Password reset for this user not possible' });

        return chakram.wait();
      });
  });

  it('should deny password change with empty token parameter', function () {
    return chakram.post(`${BASE_URL}/users/password-reset`, { password: 'ignored_anyway', token: '   ', email: 'tester@test.test' })
      .then(function (response) {
        expect(response).to.have.status(422);
      });
  });

  it('should deny email confirmation with wrong token', function () {
    return chakram.post(`${BASE_URL}/users/confirm-email`, { token: 'invalid_password-reset_token', email: 'tester@test.test' })
      .then(function (response) {
        expect(response).to.have.status(403);

        return chakram.wait();
      });
  });

  it('should allow users to request their details', function () {
    return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(getUserSchema);
        expect(response).to.comprise.of.json({ code: 'Ok', data: { me: { email: 'tester@test.test' } } });

        return chakram.wait();
      });
  });

  it('should allow users request a resend of the email confirmation', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: 'mrtest', email: 'tester4@test.test', password: '12345678' })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;

        return chakram.post(`${BASE_URL}/users/me/resend-email-confirmation`, {}, { headers: { 'Authorization': `Bearer ${response.body.token}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.comprise.of.json({ code: 'Ok', message: 'Email confirmation has been sent to tester4@test.test' });

        return chakram.wait();
      });
  });

  it('should deny to register with multiline username', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: `multi
    line name`, email: 'tester5@test.test', password: '12345678' })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        return chakram.wait();
      });
  });
});
