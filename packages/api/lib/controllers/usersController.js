'use strict';

const { User } = require('@sensebox/opensensemap-api-models'),
  { InternalServerError, ForbiddenError } = require('restify-errors'),
  { checkContentType, redactEmail, postToSlack, clearCache } = require('../helpers/apiUtils'),
  { retrieveParameters } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler'),
  { createToken, refreshJwt, invalidateToken } = require('../helpers/jwtHelpers');

/**
 * define for nested user parameter for box creation request
 * @apiDefine User Parameters for creating a new openSenseMap user
 */

/**
 * @apiDefine UserBody
 *
 * @apiParam (User) {String} name the full name or nickname of the user. The name must consist of at least 3 and up to 40 characters and only allows to use alphanumerics (a-zA-Z0-9), dots (.), dashes (-), underscores (_) and spaces. The first character must be a letter or number.
 * @apiParam (User) {String} email the email for the user. Is used for signing in and for sending the arduino sketch.
 * @apiParam (User) {String} password the desired password for the user. Must be at least 8 characters long.
 * @apiParam (User) {String} [language=en_US] the language of the user. Used for the website and mails
 *
 */

/**
 * @apiDefine JWTokenAuth
 *
 * @apiHeader {String} Authorization allows to send a valid JSON Web Token along with this request with `Bearer` prefix.
 * @apiHeaderExample {String} Authorization Header Example
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q
 * @apiError {String} 403 {"code":"Forbidden","message":"Invalid JWT. Please sign sign in"}
 */

/**
 * @api {post} /users/register Register new
 * @apiName register
 * @apiDescription Register a new openSenseMap user
 * @apiGroup Users
 * @apiUse UserBody
 * @apiSuccess (Created 201) {String} code `Created`
 * @apiSuccess (Created 201) {String} message `Successfully registered new user`
 * @apiSuccess (Created 201) {String} token valid json web token
 * @apiSuccess (Created 201) {String} refreshToken valid refresh token
 * @apiSuccess (Created 201) {Object} data `{ "user": {"name":"fullname","email":"test@test.de","role":"user","language":"en_US","boxes":[],"emailIsConfirmed":false} }`
 */
const registerUser = async function registerUser(req, res, next) {
  const { email, password, language, name } = req._userParams;

  try {
    const newUser = await new User({ name, email, password, language })
      .save();
    postToSlack(`New User: ${newUser.name} (${redactEmail(newUser.email)})`);

    try {
      const { token, refreshToken } = await createToken(newUser);

      return res.send(201, { code: 'Created', message: 'Successfully registered new user', data: { user: newUser }, token, refreshToken });
    } catch (err) {
      return next(new InternalServerError(`User successfully created but unable to create jwt token: ${err.message}`));
    }
  } catch (err) {
    handleError(err, next);
  }
};

/**
 * @api {post} /users/sign-in Sign in
 * @apiName sign-in
 * @apiDescription Sign in using email or name and password. The response contains a valid JSON Web Token. Always use `application/json` as content-type.
 * @apiGroup Users
 * @apiParam {String} email the email or name of the user
 * @apiParam {String} password the password of the user
 * @apiSuccess {String} code `Authorized`
 * @apiSuccess {String} message `Successfully signed in`
 * @apiSuccess {String} token valid json web token
 * @apiSuccess {String} refreshToken valid refresh token
 * @apiSuccess {Object} data `{ "user": {"name":"fullname","email":"test@test.de","role":"user","language":"en_US","boxes":[],"emailIsConfirmed":false} }`
 * @apiError {String} 403 Unauthorized
 */
const signIn = async function signIn(req, res, next) {
  const { email: emailOrName, password } = req._userParams;

  try {
    // lowercase for email
    const user = await User
      .findOne({ $or: [{ email: emailOrName.toLowerCase() }, { name: emailOrName }] })
      .exec();

    if (!user) {
      throw new ForbiddenError('User and or password not valid!');
    }

    if (await user.checkPassword(password)) {
      const { token, refreshToken } = await createToken(user);

      return res.send(200, { code: 'Authorized', message: 'Successfully signed in', data: { user }, token, refreshToken });
    }
  } catch (err) {
    if (err.name === 'ModelError' && err.message === 'Password incorrect') {
      return handleError(new ForbiddenError('User and or password not valid!'), next);
    }
    handleError(err, next);
  }
};

/**
 * @api {post} /users/refresh-auth Refresh Authorization
 * @apiName refresh-auth
 * @apiDescription Allows to request a new JSON Web Token using the refresh token sent along with the JWT when signing in and registering
 * @apiGroup Users
 * @apiParam {String} token the refresh token
 * @apiSuccess {String} code `Authorized`
 * @apiSuccess {String} message `Successfully refreshed auth`
 * @apiSuccess {String} token valid json web token
 * @apiSuccess {String} refreshToken valid refresh token
 * @apiSuccess {Object} data `{ "user": {"name":"fullname","email":"test@test.de","role":"user","language":"en_US","boxes":[],"emailIsConfirmed":false} }`
 * @apiError {Object} Forbidden `{"code":"ForbiddenError","message":"Refresh token invalid or too old. Please sign in with your username and password."}`
 */
const refreshJWT = async function refreshJWT(req, res, next) {
  try {
    const { token, refreshToken, user } = await refreshJwt(req._userParams.token);
    res.send(200, { code: 'Authorized', message: 'Successfully refreshed auth', data: { user }, token, refreshToken });
  } catch (err) {
    handleError(err, next);
  }
};

/**
 * @api {post} /users/sign-out Sign out
 * @apiName sign-out
 * @apiDescription Sign out using a valid JSON Web Token. Invalidates the current JSON Web Token
 * @apiGroup Users
 * @apiUse JWTokenAuth
 * @apiSuccess {String} code `Ok`
 * @apiSuccess {String} message `Successfully signed out`
 */
const signOut = function signOut(req, res) {
  invalidateToken(req);

  return res.send(200, { code: 'Ok', message: 'Successfully signed out' });
};

/**
 * @api {post} /users/request-password-reset request password reset
 * @apiName request-password-reset
 * @apiDescription request a password reset in case of a forgotten password. Sends a link with instructions to reset the users password to the specified email address. The link is valid for 12 hours.
 * @apiGroup Users
 * @apiParam {String} email the email of the user to request the password reset for
 * @apiSuccess {String} code `Ok`
 * @apiSuccess {String} message `Password reset initiated`
 */
// generate new password reset token and send the token to the user
const requestResetPassword = async function requestResetPassword(req, res, next) {
  try {
    await User.initPasswordReset(req._userParams);
    res.send(200, { code: 'Ok', message: 'Password reset initiated' });
  } catch (err) {
    handleError(err, next);
  }
};

/**
 * @api {post} /users/password-reset reset password with passwordResetToken
 * @apiName password-reset
 * @apiDescription reset password with token sent through email
 * @apiGroup Users
 * @apiParam {String} password new password. needs to be at least 8 characters
 * @apiParam {String} token the password reset token which was sent via email to the user
 * @apiSuccess {String} code `Ok`
 * @apiSuccess {String} message `Password successfully changed. You can now login with your new password`
 */
// set new password with reset token as auth
const resetPassword = async function resetPassword(req, res, next) {
  try {
    await User.resetPassword(req._userParams);
    res.send(200, { code: 'Ok', message: 'Password successfully changed. You can now login with your new password' });
  } catch (err) {
    handleError(err, next);
  }
};

/**
 * @api {post} /users/confirm-email confirm email address
 * @apiName confirm-email
 * @apiDescription confirm email address to the system
 * @apiGroup Users
 * @apiParam {String} email the email of the user to confirm
 * @apiParam {String} token the email confirmation token which was sent via email to the user
 * @apiSuccess {String} code `Ok`
 * @apiSuccess {String} message `E-Mail successfully confirmed. Thank you`
 */
const confirmEmailAddress = async function confirmEmailAddress(req, res, next) {
  try {
    await User.confirmEmail(req._userParams);
    res.send(200, { code: 'Ok', message: 'E-Mail successfully confirmed. Thank you' });
  } catch (err) {
    handleError(err, next);
  }
};

/**
 * @api {post} /users/me/boxes list all boxes of the signed in user
 * @apiName getUserBoxes
 * @apiDescription List all boxes of the signed in user with secret fields
 * @apiGroup Users
 * @apiSuccess {String} code `Ok`
 * @apiSuccess {String} data A json object with a single `boxes` array field
 */
const getUserBoxes = async function getUserBoxes(req, res, next) {
  try {
    const boxes = await req.user.getBoxes();
    res.send(200, { code: 'Ok', data: { boxes } });
  } catch (err) {
    handleError(err, next);
  }
};

/**
 * @api {get} /users/me Get details
 * @apiName getUser
 * @apiDescription Returns information about the currently signed in user
 * @apiGroup Users
 * @apiUse JWTokenAuth
 */
const getUser = function getUser(req, res) {
  res.send(200, { code: 'Ok', data: { me: req.user } });
};

/**
 * @api {put} /users/me Update user details
 * @apiName updateUser
 * @apiDescription Allows to change name, email, language and password of the currently signed in user. Changing the password triggers a sign out. The user has to log in again with the new password. Changing the mail triggers a Email confirmation process.
 * @apiGroup Users
 * @apiUse JWTokenAuth
 * @apiParam {String} [email] the new email address for this user.
 * @apiParam {String} [language] the new language for this user.
 * @apiParam {String} [name] the new name for this user. The name must consist of at least 4 and up to 40 characters and only allows to use alphanumerics (a-zA-Z0-9), dots (.), dashes (-), underscores (_) and spaces. The first character must be a letter or number.
 * @apiParam {String} [newPassword] the new password for this user. Should be at least 8 characters long.
 * @apiParam {String} currentPassword the current password for this user.
 */
const updateUser = async function updateUser(req, res, next) {
  try {
    const { updated, signOut, messages, updatedUser } = await req.user.updateUser(req._userParams);
    if (updated === false) {
      return res.send(200, { code: 'Ok', message: 'No changed properties supplied. User remains unchanged.' });
    }

    if (signOut === true) {
      invalidateToken(req);
    }
    res.send(200, { code: 'Ok', message: `User successfully saved.${messages.join('.')}`, data: { me: updatedUser } });
  } catch (err) {
    handleError(err, next);
  }
};

/**
 * @api {delete} /users/me Delete user, all of its boxes and all of its boxes measurements
 * @apiName deleteUser
 * @apiDescription Allows to delete the currently logged in user using its password. All of the boxes and measurements of the user will be deleted as well.
 * @apiGroup Users
 * @apiUse JWTokenAuth
 * @apiParam {String} password the current password for this user.
 */

const deleteUser = async function deleteUser(req, res, next) {
  const { password } = req._userParams;

  try {
    await req.user.checkPassword(password);
    invalidateToken(req);

    await req.user.destroyUser();
    res.send(200, { code: 'Ok', message: 'User and all boxes of user marked for deletion. Bye Bye!' });
    clearCache(['getBoxes', 'getStats']);
    postToSlack(`User deleted: ${req.user.name} (${redactEmail(req.user.email)})`);
  } catch (err) {
    handleError(err, next);
  }
};

/**
 * @api {post} /users/me/resend-email-confirmation request a resend of the email confirmation
 * @apiName resend-email-confirmation
 * @apiDescription request to resend the E-mail for confirmation of said address. Sends a link with instructions to confirm the users email address.
 * @apiGroup Users
 * @apiUse JWTokenAuth
 * @apiSuccess {String} code `Ok`
 * @apiSuccess {String} message `Email confirmation has been sent to <emailaddress>`
 */
const requestEmailConfirmation = async function requestEmailConfirmation(req, res, next) {
  try {
    const result = await req.user.resendEmailConfirmation();
    let usedAddress = result.email;
    if (result.unconfirmedEmail) {
      usedAddress = result.unconfirmedEmail;
    }
    res.send(200, { code: 'Ok', message: `Email confirmation has been sent to ${usedAddress}` });
  } catch (err) {
    handleError(err, next);
  }
};

const getPublicInformation = async function getPublicInformation(req, res, next) {
  try {
    const user = await User.findOne({ name: req.params.username });
    if (!user._doc.isPublic || !user.isPublic) {
      res.send(403, { code: 'Ok', message: 'Users profile is not public', user: null });
    } else {
      res.send(200, { code: 'Ok', user: user });
    }
  } catch (err) {
    handleError(err, next);
  }
}

module.exports = {
  registerUser: [
    checkContentType,
    retrieveParameters([
      { name: 'email', dataType: 'email', required: true },
      { predef: 'password' },
      { name: 'name', required: true, dataType: 'as-is' },
      { name: 'language', defaultValue: 'en_US' }
    ]),
    registerUser
  ],
  signIn: [
    checkContentType,
    retrieveParameters([
      { name: 'email', required: true },
      { predef: 'password' },
    ]),
    signIn
  ],
  signOut,
  resetPassword: [
    checkContentType,
    retrieveParameters([
      { name: 'token', required: true },
      { predef: 'password' }
    ]),
    resetPassword
  ],
  requestResetPassword: [
    checkContentType,
    retrieveParameters([
      { name: 'email', dataType: 'email', required: true }
    ]),
    requestResetPassword
  ],
  confirmEmailAddress: [
    checkContentType,
    retrieveParameters([
      { name: 'token', required: true },
      { name: 'email', dataType: 'email', required: true },
    ]),
    confirmEmailAddress
  ],
  requestEmailConfirmation,
  getUserBoxes,
  getPublicInformation,
  updateUser: [
    checkContentType,
    retrieveParameters([
      { name: 'email', dataType: 'email' },
      { predef: 'password', name: 'currentPassword', required: false },
      { predef: 'password', name: 'newPassword', required: false },
      { name: 'name', dataType: 'as-is' },
      { name: 'language' }
    ]),
    updateUser
  ],
  getUser,
  refreshJWT: [
    checkContentType,
    retrieveParameters([
      { name: 'token', required: true }
    ]),
    refreshJWT
  ],
  deleteUser: [
    checkContentType,
    retrieveParameters([
      { predef: 'password' }
    ]),
    deleteUser
  ]
};
