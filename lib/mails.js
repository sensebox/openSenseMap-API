'use strict';

const { config, Honeybadger } = require('./utils'),
  log = require('./log');


const noMailerConfiguredFunc = function () {
  return Promise.resolve({ 'msg': 'no mailer configured' });
};

module.exports = {
  sendMail: noMailerConfiguredFunc
};

if (config.mailer_url && config.mailer_url.trim() !== '') {
  /* eslint-disable global-require */
  const fs = require('fs'),
    request = require('request-promise-native');
  /* eslint-enable global-require */

  const mailTemplates = {
    'newBox' (user, box) {
      // read script before sending..
      const script = fs.readFileSync(`${config.targetFolder}${box._id}.ino`, 'utf-8');

      return {
        payload: {
          box
        },
        attachment: {
          filename: 'senseBox.ino',
          contents: new Buffer(script).toString('base64')
        }
      };
    },
    'newBoxLuftdaten' (user, box) {
      return {
        payload: {
          box
        }
      };
    },
    'newUser' (user) {
      return {
        payload: {
          token: user.emailConfirmationToken,
          email: user.email
        }
      };
    }, // email confirmation request
    'passwordReset' (user) {
      return {
        payload: {
          token: user.resetPasswordToken
        }
      };
    },
    'newUserManagement' (user, boxes) {
      return {
        payload: {
          boxes,
          token: user.resetPasswordToken
        }
      };
    },
    'confirmEmail' (user) {
      return {
        recipient: {
          address: user.unconfirmedEmail,
          name: user.name
        },
        payload: {
          token: user.emailConfirmationToken,
          email: user.unconfirmedEmail
        }
      };
    },
    'newSketch' (user, box) {
      // read script before sending..
      const script = fs.readFileSync(`${config.targetFolder}${box._id}.ino`, 'utf-8');

      return {
        payload: {
          box
        },
        attachment: {
          filename: 'senseBox.ino',
          contents: new Buffer(script).toString('base64')
        }
      };
    }
  };

  const requestMailer = (payload) => {
    return request({
      url: config.mailer_url,
      cert: config.mailer_cert,
      key: config.mailer_key,
      ca: config.mailer_ca,
      json: payload
    })
      .then((response) => {
        log.info(`successfully sent mails: ${JSON.stringify(response)}`);

        return response;
      })
      .catch((err) => {
        log.error('Mailer', err.message);
        Honeybadger.notify(err);

        return err;
      });
  };

  module.exports = {
    sendMail (template, user, data) {
      if (!(template in mailTemplates)) {
        return Promise.reject(`template ${template} not implemented`);
      }

      const { payload, attachment, recipient = { address: user.email, name: user.name } } = mailTemplates[template](user, data);

      // add user and origin to payload
      payload.user = user;
      payload.origin = config.mailer_origin;

      // complete the payload
      const mailRequestPayload = [
        {
          template,
          lang: user.language,
          recipient,
          payload,
          attachment
        }
      ];

      return requestMailer(mailRequestPayload);

    }
  };
}

