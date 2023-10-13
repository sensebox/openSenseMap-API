'use strict';

const log = require('@sensebox/opensensemap-api-models/src/log');
const { Queue } = require('bullmq');
const config = require('config').get('integrations.mybadges');

let queue;

const requestQueue = () => {
  if (queue) {
    return queue;
  }
  queue = new Queue(config.get('queue'), {
    connection: {
      host: config.get('redis.host'),
      port: config.get('redis.port'),
      username: config.get('redis.username'),
      password: config.get('redis.password'),
      db: config.get('redis.db'),
    }
  });

  return queue;
};

const grantBadge = async function (req) {

  const integrationEnabled = req.user.get('integrations.mybadges.enabled');

  if (!integrationEnabled) {return;}

  const payload = {
    email: req.user.email,
    route: req.route
  };

  return requestQueue()
    .add('grant-badge', payload, {
      removeOnComplete: true
    })
    .then((response) => {
      log.info({
        msg: 'Successfully added grant-badge to queue',
        job_id: response.id,
        template: response.name
      });
    });
};

module.exports = {
  grantBadge: grantBadge
};
