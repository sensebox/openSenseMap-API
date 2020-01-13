'use strict';

const { mongoose } = require('../db'),
  utils = require('../utils'),
  isJSONParseableValidation = [utils.isJSONParseable, '{PATH} is not parseable as JSON'],
  mqttClient = require('./mqttClient');

const mqttSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false, required: true },
  url: { type: String, trim: true, validate: [function validMqttUri (url) { return url === '' || url.startsWith('mqtt://') || url.startsWith('ws://'); }, '{PATH} must be either empty or start with mqtt:// or ws://'] },
  topic: { type: String, trim: true },
  messageFormat: { type: String, trim: true, enum: ['json', 'csv', 'application/json', 'text/csv', 'debug_plain', ''] },
  decodeOptions: { type: String, trim: true, validate: isJSONParseableValidation },
  connectionOptions: { type: String, trim: true, validate: isJSONParseableValidation }
}, { _id: false, usePushEach: true });

const ttnSchema = new mongoose.Schema({
  dev_id: { type: String, trim: true, required: true },
  app_id: { type: String, trim: true, required: true },
  port: { type: Number, min: 0 },
  profile: { type: String, trim: true, enum: ['json', 'debug', 'sensebox/home', 'lora-serialization'], required: true },
  decodeOptions: [{}]
}, { _id: false, usePushEach: true });

const integrationSchema = new mongoose.Schema({
  mqtt: {
    type: mqttSchema,
    required: false,
    validate: [function validMqttConfig (mqtt) {
      if (mqtt.enabled === true) {
        if (!utils.isNonEmptyString(mqtt.url)) {
          return false;
        }
        if (!utils.isNonEmptyString(mqtt.topic)) {
          return false;
        }
        if (!utils.isNonEmptyString(mqtt.messageFormat)) {
          return false;
        }
      }

      return true;
    }, 'if {PATH} is true, url, topic and messageFormat should\'t be empty or invalid']
  },

  ttn: {
    type: ttnSchema,
    required: false,
    validate: [{
      /* eslint-disable func-name-matching */
      validator: function validTTNDecodeOptions (ttn) {
        /* eslint-enable func-name-matching */
        if (['debug', 'lora-serialization'].indexOf(ttn.profile) !== -1) {
          return (ttn.decodeOptions && ttn.decodeOptions.constructor === Array);
        }
      },
      msg: 'this profile requires an array \'decodeOptions\''
    }]
  }
}, { _id: false, usePushEach: true });


const addIntegrationsToSchema = function addIntegrationsToSchema (schema) {
  schema.add({ integrations: { type: integrationSchema } });

  mqttClient.addToSchema(schema);
};

module.exports = {
  schema: integrationSchema,
  addToSchema: addIntegrationsToSchema,
  // no model, bc its used as subdocument in boxSchema!
};
