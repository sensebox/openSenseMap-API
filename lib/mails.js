'use strict';

// TODO: registration mail for email confirmation
// TODO: change new box mail

const utils = require('./utils'),
  cfg = utils.config,
  Honeybadger = utils.Honeybadger;

const noMailerConfiguredFunc = function () {
  return Promise.resolve({ 'msg': 'no mailer configured' });
};

module.exports = {
  sendWelcomeMail: noMailerConfiguredFunc,
  sendPasswordResetMail: noMailerConfiguredFunc
};

if (cfg.mailer_url && cfg.mailer_url.trim() !== '') {
  /* eslint-disable global-require */
  const fs = require('fs'),
    request = require('request-promise-native');
  /* eslint-enable global-require */

  const requestMailer = (payload) => {
    return request({
      url: cfg.mailer_url,
      cert: cfg.mailer_cert,
      key: cfg.mailer_key,
      ca: cfg.mailer_ca,
      json: payload
    });
  };

  module.exports = {
    sendWelcomeMail (user, box) {
      // read script before sending..
      const script = fs.readFileSync(`${cfg.targetFolder}${box._id}.ino`, 'utf-8');

      // this is the payload sent to the mailing daemon
      const payload = [
        {
          template: 'registration',
          lang: user.language,
          recipient: {
            address: user.email,
            name: user.fullname
          },
          payload: {
            user: user,
            box: box,
            origin: cfg.mailer_origin
          },
          attachment: {
            filename: 'senseBox.ino',
            contents: new Buffer(script).toString('base64')
          }
        }
      ];

      return requestMailer(payload)
        .then((response) => {
          console.log(`successfully sent mails: ${JSON.stringify(response)}`);

          return response;
        })
        .catch((err) => {
          Honeybadger.notify(err);
          console.error(err);
        });
    },
    sendPasswordResetMail (user) {
      // this is the payload sent to the mailing daemon
      const payload = [
        {
          template: 'passwordReset',
          lang: user.language,
          recipient: {
            address: user.email,
            name: user.fullname
          },
          payload: {
            user: user,
            token: user.resetPasswordToken,
            origin: cfg.mailer_origin
          }
        }
      ];

      return requestMailer(payload)
        .then((response) => {
          console.log(`successfully sent mails: ${JSON.stringify(response)}`);

          return response;
        })
        .catch((err) => {
          Honeybadger.notify(err);
          console.error(err);
        });
    }
  };
}

