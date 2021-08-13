'use strict';

const protoLoader = require('@grpc/proto-loader'),
  grpcLibrary = require('@grpc/grpc-js'),
  { mqttProto } = require('@sensebox/osem-protos'),
  log = require('../log'),
  config = require('config').get('openSenseMap-API-models');

const genericCallback = function (err, response) {
  if (err) {
    return log.error(err);
  }
  log.info({ mqttClient: { response } });
};

module.exports = {
  addToSchema (schema) {
    const { ca_cert, key, cert, mqtt: { url } } = config.get('integrations');

    if (!ca_cert || !cert || !key || !url) {
      log.info('Missing MQTT integration configuration. Disabled');

      return;
    }

    const packageDefinition = protoLoader.loadSync(mqttProto);
    const MqttService = grpcLibrary.loadPackageDefinition(packageDefinition).MqttService;

    const credentials = grpcLibrary.credentials.createSsl(
      Buffer.from(ca_cert),
      Buffer.from(key),
      Buffer.from(cert)
    );

    const client = new MqttService(url, credentials);
    log.info({ mqttClient: 'connected GRPC client' });

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
      if (box._mqttChanged === true && box.integrations.mqtt) {
        if (box.integrations.mqtt.enabled === true) {
          client.connectBox({ box_id: box._id.toString() }, genericCallback);
        } else if (box.integrations.mqtt.enabled === false) {
          // mqttClient.disconnect(box);
          client.disconnectBox({ box_id: box._id.toString() }, genericCallback);
        }
      }
      box._mqttChanged = undefined;
    });

    // disconnect mqtt on removal
    schema.pre('remove', function integrationsPostRemove (next) {
      // mqttClient.disconnect(this);
      client.disconnectBox({ box_id: this._id.toString() }, genericCallback);
      next();
    });

    return {
      connect () {

      },
      disconnect () {

      }
    };


  }
};
