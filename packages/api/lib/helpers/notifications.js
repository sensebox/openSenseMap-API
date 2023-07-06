'use strict';

const { Novu } = require('@novu/node');
const config = require('config');

const options = { backendUrl: config.get('novu.backend_url') };
const api_key = config.get('novu.api_key');

const novu = new Novu(api_key, options);

const triggerNotification = async function triggerNotification (subscriberId, payload) {
  novu.trigger('badge-notification-osem', {
    to: {
      subscriberId: subscriberId
    },
    payload: payload,
  });
};

module.exports = {
  triggerNotification
};
