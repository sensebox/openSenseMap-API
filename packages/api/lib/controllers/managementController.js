'use strict';

const { ForbiddenError } = require('restify-errors'),
  { Box } = require('@sensebox/opensensemap-api-models');

const checkPrivilege = function checkPrivilege (roles) {
  if (!Array.isArray(roles)) {
    roles = [roles];
  }

  return function checkRolePrivilege (req, res, next) {
    if (!req.user) {
      return next(new ForbiddenError('Not signed in or not authorized to access.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Not signed in or not authorized to access.'));
    }
  };
};

const listBoxes = async function listBoxes (req, res, next) {
  const boxes = await Box.find().exec();

  res.send({ code: 'Ok', boxes });
};

module.exports = {
  checkPrivilege,
  listBoxes,
  // updateBoxes,
  // deleteBoxes,
  // listUsers,
  // updateUsers,
  // deleteUsers
};
