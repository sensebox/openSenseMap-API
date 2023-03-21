'use strict';

const config = require('config').get('openSenseMap-API-models.integrations'),
  log = require('../log');

const noQueueConfiguredFunc = function () {
  return Promise.resolve({ msg: 'no queue configured' });
};

module.exports = {
  addToQueue: noQueueConfiguredFunc,
};

if (config.has('redis') && config.has('redis.host') && config.has('redis.port') && config.has('redis.username') && config.has('redis.password') && config.has('redis.db') && config.has('mailer.queue')) {
  /* eslint-disable global-require */
  const { Queue } = require('bullmq');
  /* eslint-enable global-require */

  let queue;

  const mailTemplates = {
    newBox (user, box) {
      const sketchParams = {
        encoding: 'base64',
        ssid: '',
        password: '',
        serialPort: box.serialPort,
        soilDigitalPort: box.soilDigitalPort,
        soundMeterPort: box.soundMeterPort,
        windSpeedPort: box.windSpeedPort,
        devEUI: '',
        appEUI: '',
        appKey: '',
      };

      if (box.access_token) {
        sketchParams.access_token = box.access_token;
      }

      return {
        payload: {
          box,
        },
        attachment: {
          filename: 'senseBox.ino',
          contents: box.getSketch(sketchParams),
        },
      };
    },
    newBoxLuftdaten (user, box) {
      return {
        payload: {
          box,
        },
      };
    },
    newBoxHackAir (user, box) {
      return {
        payload: {
          box,
        },
      };
    },
    newUser (user) {
      return {
        payload: {
          token: user.emailConfirmationToken,
          email: user.email,
        },
      };
    }, // email confirmation request
    passwordReset (user) {
      return {
        payload: {
          token: user.resetPasswordToken,
        },
      };
    },
    newUserManagement (user, boxes) {
      return {
        payload: {
          boxes,
          token: user.resetPasswordToken,
        },
      };
    },
    confirmEmail (user) {
      return {
        recipient: {
          address: user.unconfirmedEmail,
          name: user.name,
        },
        payload: {
          token: user.emailConfirmationToken,
          email: user.unconfirmedEmail,
        },
      };
    },
    resendEmailConfirmation (user) {
      let addressToUse = user.email;
      if (user.unconfirmedEmail) {
        addressToUse = user.unconfirmedEmail;
      }

      return {
        recipient: {
          address: addressToUse,
          name: user.name,
        },
        payload: {
          token: user.emailConfirmationToken,
          email: addressToUse,
        },
      };
    },
    newSketch (user, box) {
      return {
        payload: {
          box,
        },
        attachment: {
          filename: 'senseBox.ino',
          contents: box.getSketch({
            encoding: 'base64',
            access_token: box.access_token,
          }),
        },
      };
    },
    deleteUser () {
      return {};
    },
  };

  const requestQueue = () => {
    if (queue) {
      return queue;
    }
    queue = new Queue(config.get('mailer.queue'), {
      connection: {
        host: config.get('redis.host'),
        port: config.get('redis.port'),
        username: config.get('redis.username'),
        password: config.get('redis.password'),
        db: config.get('redis.db'),
      },
    });

    return queue;
  };

  module.exports = {
    addToQueue (template, user, data) {
      const {
        payload = {},
        attachment,
        recipient = { address: user.email, name: user.name },
      } = mailTemplates[template](user, data);

      // add user and origin to payload
      payload.user = user;
      payload.origin = config.get('mailer.origin');

      return requestQueue().add(template, {
        template,
        lang: user.language,
        recipient,
        payload,
        attachment
      }, {
        removeOnComplete: true,
      })
        .then((response) => {
          log.info({
            msg: 'Successfully added mail to queue',
            job_id: response.id,
            template: response.name
          });
        })
        .catch((err) => {
          throw err;
        });
    }
  };
}
