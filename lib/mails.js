'use strict';

const utils = require('./utils'),
  cfg = utils.config,
  Honeybadger = utils.Honeybadger;

const noMailerConfiguredFunc = function () {
  return Promise.resolve({ 'msg': 'no mailer configured' });
};

module.exports = {
  sendWelcomeMail: noMailerConfiguredFunc
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
      let template = 'registration';

      if (box.model && box.model.toString().includes('luftdaten')) {
        template = 'registrationLuftdaten';
      }

      // check if the user as a language..
      let mailLang = user.language;
      if (!mailLang || mailLang === '') {
        mailLang = 'de_DE';
      }

      // this is the payload sent to the mailing daemon
      const payload = [
        {
          template,
          lang: mailLang,
          recipient: {
            address: user.email,
            name: `${user.firstname} ${user.lastname}`
          },
          payload: {
            user: user,
            box: box,
            origin: cfg.mailer_origin
          }
        }
      ];

      if (template !== 'registrationLuftdaten') {
        // read script before sending..
        const script = fs.readFileSync(`${cfg.targetFolder}${box._id}.ino`, 'utf-8');

        payload[0].attachment = {
          filename: 'senseBox.ino',
          contents: new Buffer(script).toString('base64')
        };
      }

      return requestMailer(payload)
        .then((response) => {
          console.log(`successfully sent mails: ${JSON.stringify(response)}`);
        })
        .catch((err) => {
          Honeybadger.notify(err);
          console.error(err);
        });
    },
    sendNewSketchMail (user, box) {
      // read script before sending..
      const script = fs.readFileSync(`${cfg.targetFolder}${box._id}.ino`, 'utf-8');

      // check if the user as a language..
      let mailLang = user.language;
      if (!mailLang || mailLang === '') {
        mailLang = 'de_DE';
      }

      // this is the payload sent to the mailing daemon
      const payload = [
        {
          template: 'newSketch',
          lang: mailLang,
          recipient: {
            address: user.email,
            name: `${user.firstname} ${user.lastname}`
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
        })
        .catch((err) => {
          Honeybadger.notify(err);
          console.error(err);
        });
    }
  };
}

