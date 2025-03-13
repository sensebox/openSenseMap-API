'use strict';

const invariant = require('tiny-invariant');

const validateField = function validateField (field, expr, msg) {
  try {
    invariant(expr, msg);
  } catch (error) {
    const err = new Error(msg);
    err.name = 'ValidationError';
    err.errors = {
      [field]: { message: msg }
    };
    throw err;
  }
};

module.exports = {
  validateField
};
