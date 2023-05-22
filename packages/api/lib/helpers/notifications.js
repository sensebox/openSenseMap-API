const { Novu } = require('@novu/node');

const config = require('config');

const novu = new Novu(config.get('novu_api_key'));

const triggerNotification = async function triggerNotification(subscriberId, payload) {
    novu.trigger('badge-notification', {
        to: {
            subscriberId: subscriberId
        },
        payload: payload,
    });
}

module.exports = {
    triggerNotification
}