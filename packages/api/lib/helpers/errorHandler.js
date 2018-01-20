'use strict';

const restifyErrors = require('restify-errors');

const restifyErrorNames = Object.keys(restifyErrors).filter(e => e.includes('Error') && e !== 'codeToHttpError');

const handleError = function (err, next) {
  if (err.name === 'ModelError') {
    if (err.data && err.data.type) {
      return next(new restifyErrors[err.data.type](err.message));
    }

    return next(new restifyErrors.BadRequestError(err.message));
  }

  if (err.name === 'ValidationError') {
    const msgs = [];
    for (const field in err.errors) {
      if (!err.errors[field].errors) {
        msgs.push(err.errors[field].message);
      }
    }

    return next(new restifyErrors.UnprocessableEntityError(`Validation failed: ${msgs.join(', ')}`));
  }

  if (restifyErrorNames.includes(err.name)) {
    return next(err);
  }

  if (err.errors) {
    const msg = Object.keys(err.errors)
      .map(f => `${err.errors[f].message}`)
      .join(', ');

    return next(new restifyErrors.UnprocessableEntityError(msg));
  }

  return next(new restifyErrors.InternalServerError(err.message));
};

module.exports = handleError;

