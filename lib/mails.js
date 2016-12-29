'use strict';

const utils = require('./utils'),
  cfg = utils.config,
  Honeybadger = utils.Honeybadger;

const noMailerConfiguredFunc = function () {
  return Promise.resolve({ 'msg': 'no mailer configured' });
};

module.exports = {
  sendMail: noMailerConfiguredFunc
};

if (cfg.mailer_url && cfg.mailer_url.trim() !== '') {
  /* eslint-disable global-require */
  const fs = require('fs'),
    request = require('request-promise-native');
  /* eslint-enable global-require */

  const mailTemplates = {
    'newBox' (user, box) {
      // read script before sending..
      const script = fs.readFileSync(`${cfg.targetFolder}${box._id}.ino`, 'utf-8');

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
    'newUser' () {
      return {
        payload: {}
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
      return { boxes };
    }
  };

  const requestMailer = (payload) => {
    return request({
      url: cfg.mailer_url,
      cert: cfg.mailer_cert,
      key: cfg.mailer_key,
      ca: cfg.mailer_ca,
      json: payload
    })
    .then((response) => {
      console.log(`successfully sent mails: ${JSON.stringify(response)}`);

      return response;
    })
    .catch((err) => {
      Honeybadger.notify(err);
    });
  };

  module.exports = {
    sendMail (template, user, data) {
      if (!(template in mailTemplates)) {
        return Promise.reject(`template ${template} not implemented`);
      }

      const { payload, attachment } = mailTemplates[template](user, data);

      // add user and origin to payload
      payload.user = user;
      payload.origin = cfg.mailer_origin;

      // complete the payload
      const mailRequestPayload = [
        {
          template,
          lang: user.language,
          recipient: {
            address: user.email,
            name: user.fullname
          },
          payload,
          attachment
        }
      ];

      return requestMailer(mailRequestPayload);

    }
  };
}

