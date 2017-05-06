'use strict';

const { mongoose } = require('../db'),
  Schema = mongoose.Schema,
  mqttClient = require('../mqtt'),
  utils = require('../utils'),
  isJSONParseableValidation = [utils.isJSONParseable, '{PATH} is not parseable as JSON'];

/**
 * MQTT broker integration data
 * @apiDefine MqttOption Settings for a senseBox connected through MQTT
 */

/**
 * @apiDefine MqttBody
 *
 * @apiParam (MqttOption) {Boolean} enabled="false" enable or disable mqtt
 * @apiParam (MqttOption) {String} url the url to the mqtt server.
 * @apiParam (MqttOption) {String} topic the topic to subscribe to.
 * @apiParam (MqttOption) {String="json","csv"} messageFormat the format the mqtt messages are in.
 * @apiParam (MqttOption) {String} decodeOptions a json encoded string with options for decoding the message. 'jsonPath' for 'json' messageFormat.
 * @apiParam (MqttOption) {String} connectionOptions a json encoded string with options to supply to the mqtt client (https://github.com/mqttjs/MQTT.js#client)
 */

const mqttSchema = new Schema({
  enabled: { type: Boolean, default: false, required: true },
  url: { type: String, trim: true, validate: [function validMqttUri (url) { return url === '' || url.startsWith('mqtt://') || url.startsWith('ws://'); }, '{PATH} must be either empty or start with mqtt:// or ws://'] },
  topic: { type: String, trim: true },
  messageFormat: { type: String, trim: true, enum: ['json', 'csv', 'application/json', 'text/csv', 'debug_plain', ''] },
  decodeOptions: { type: String, trim: true, validate: isJSONParseableValidation },
  connectionOptions: { type: String, trim: true, validate: isJSONParseableValidation }
}, { _id: false });

/**
 * thethingsnetwork.org integration data
 * @apiDefine TTNOption Settings for a senseBox connected through thethingsnetwork.org (TTN)
 */

/**
 * @apiDefine TTNBody
 *
 * @apiParam (TTNOption) {String} dev_id The device ID recieved from TTN
 * @apiParam (TTNOption) {String} app_id The application ID recieved from TTN
 * @apiParam (TTNOption) {String="lora-serialization","sensebox/home","json","debug"} profile A decoding profile matching the payload format. For details and configuration see https://github.com/sensebox/ttn-osem-integration#decoding-profiles
 * @apiParam (TTNOption) {Array}  [decodeOptions] A JSON Array containing decoder configuration, needed for some profiles.
 * @apiParam (TTNOption) {Number} [port] The TTN port to listen for messages. Optional, if not provided, all ports are used.
 */
const ttnSchema = new Schema({
  dev_id: { type: String, trim: true, required: true },
  app_id: { type: String, trim: true, required: true },
  port: { type: Number, min: 0 },
  profile: { type: String, trim: true, enum: ['json', 'debug', 'sensebox/home', 'lora-serialization'], required: true },
  decodeOptions: [{}]
}, { _id: false });

const integrationSchema = new Schema({
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
}, { _id: false });


const addIntegrationsToSchema = function addIntegrationsToSchema (schema) {
  schema.add({ integrations: { type: integrationSchema } });

  // flag whether mqtt options have changed
  schema.pre('save', function integrationsPreSave (next) {
    if (this.modifiedPaths && typeof this.modifiedPaths === 'function') {
      this._mqttChanged = this.modifiedPaths().some(function eachPath (path) {
        return path.includes('integrations');
      });
    }
    next();
  });

  // reconnect when mqtt option change was flagged
  schema.post('save', function integrationsPostSave (box) {
    if (box._mqttChanged === true) {
      if (box.integrations.mqtt.enabled === true) {
        console.log('mqtt credentials changed, reconnecting');
        mqttClient.connect(box);
      } else if (box.integrations.mqtt.enabled === false) {
        mqttClient.disconnect(box);
      }
    }
    box._mqttChanged = undefined;
  });

  // disconnect mqtt on removal
  schema.pre('remove', function integrationsPostRemove (next) {
    mqttClient.disconnect(this);
    next();
  });
};

module.exports = {
  schema: integrationSchema,
  addToSchema: addIntegrationsToSchema,
  // no model, bc its used as subdocument in boxSchema!
};
