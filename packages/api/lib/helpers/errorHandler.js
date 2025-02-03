"use strict";

const restifyErrors = require("restify-errors");

const restifyErrorNames = Object.keys(restifyErrors).filter(
  (e) => e.includes("Error") && e !== "codeToHttpError"
);

const handleError = function (err) {
  if (err.name === "ModelError") {
    const status = err.status || 400; // Ensure a fallback status

    // Map `status` to a Restify error type
    switch (status) {
      case 400:
        return Promise.reject(new restifyErrors.BadRequestError(err.message));
      case 401:
        return Promise.reject(new restifyErrors.UnauthorizedError(err.message));
      case 403:
        return Promise.reject(new restifyErrors.ForbiddenError(err.message)); // ✅ Now properly handling 403
      case 404:
        return Promise.reject(new restifyErrors.NotFoundError(err.message));
      case 422:
        return Promise.reject(
          new restifyErrors.UnprocessableEntityError(err.message)
        );
      case 500:
      default:
        return Promise.reject(
          new restifyErrors.InternalServerError(err.message)
        );
    }
  }

  if (err.name === "ValidationError") {
    const msgs = Object.keys(err.errors)
      .map((field) => err.errors[field].message)
      .join(", ");

    return Promise.reject(
      new restifyErrors.UnprocessableEntityError(`Validation failed: ${msgs}`)
    );
  }

  if (restifyErrorNames.includes(err.name)) {
    return Promise.reject(err);
  }

  return Promise.reject(new restifyErrors.InternalServerError(err.message));
};

module.exports = handleError;
