'use strict';

const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  mqttClient = require('../mqtt'),
  utils = require('../utils'),
  isJSONParseableValidation = [utils.isJSONParseable, '{PATH} is not parseable as JSON'];

// MQTT broker integration data
const mqttSchema = new Schema({
  enabled: { type: Boolean, default: false, required: true },
  url: { type: String, trim: true, validate: [function (url) { return url === '' || url.startsWith('mqtt://') || url.startsWith('ws://'); }, '{PATH} must be either empty or start with mqtt:// or ws://'] },
  topic: { type: String, trim: true },
  messageFormat: { type: String, trim: true, enum: ['json', 'csv', 'application/json', 'text/csv', 'debug_plain', ''] },
  decodeOptions: { type: String, trim: true, validate: isJSONParseableValidation },
  connectionOptions: { type: String, trim: true, validate: isJSONParseableValidation }
}, { _id: false });

// thethingsnetwork.org integration data
const ttnSchema = new Schema({
  dev_id: { type: String, trim: true, required: true },
  app_id: { type: String, trim: true, required: true }
}, { _id: false });

const integrationSchema = new Schema({
  mqtt: {
    type: mqttSchema,
    required: false,
    validate: [function (mqtt) {
      if (mqtt.enabled === true) {
        if (typeof mqtt.url === 'undefined' || mqtt.url === '') {
          return false;
        }
        if (typeof mqtt.topic === 'undefined' || mqtt.topic === '') {
          return false;
        }
        if (typeof mqtt.messageFormat === 'undefined' || mqtt.messageFormat === '') {
          return false;
        }
      }

      return true;
    }, 'if {PATH} is true, url, topic and messageFormat should\'t be empty or invalid']
  },

  ttn: {
    type: ttnSchema,
    required: false
  }
}, { _id: false });


const addToSchema = (schema) => {
  schema.add({ integrations: { type: integrationSchema } });

  // flag whether mqtt options have changed
  schema.pre('save', function (next) {
    if (this.modifiedPaths && typeof this.modifiedPaths === 'function') {
      this._mqttChanged = this.modifiedPaths().some(function (path) {
        return path.includes('mqtt');
      });
    }
    next();
  });

  // reconnect when mqtt option change was flagged
  schema.post('save', function (box) {
    if (box._mqttChanged === true) {
      if (box.mqtt.enabled === true) {
        console.log('mqtt credentials changed, reconnecting');
        mqttClient.connect(box);
      } else if (box.mqtt.enabled === false) {
        mqttClient.disconnect(box);
      }
    }
    box._mqttChanged = undefined;
  });

  // disconnect mqtt on removal
  schema.pre('remove', function (next) {
    mqttClient.disconnect(this);
    next();
  });
};

module.exports = {
  schema: integrationSchema,
  addToSchema,
  // no model, bc its used as subdocument in boxSchema!
};
