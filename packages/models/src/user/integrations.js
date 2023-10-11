'use strict';

const { mongoose } = require('../db');

const myBadgesSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
      required: false
    }
  },
  { _id: false, usePushEach: true }
);

const integrationSchema = new mongoose.Schema(
  {
    mybadges: {
      type: myBadgesSchema,
      required: false
    }
  },
  { _id: false, usePushEach: true }
);

const addIntegrationsToSchema = function addIntegrationsToSchema (schema) {
  schema.add({
    integrations: {
      type: integrationSchema
    }
  });
};

module.exports = {
  schema: integrationSchema,
  addToSchema: addIntegrationsToSchema,
  // no model, because it is used as subdocument in userSchema
};
