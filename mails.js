'use strict';
let cfg = require('./config');

let Honeybadger = {
  notify: function () {}
};
if (cfg.honeybadger_apikey && cfg.honeybadger_apikey !== '') {
  Honeybadger = require('honeybadger').configure({
    apiKey: cfg.honeybadger_apikey
  });
}

module.exports = {
  sendWelcomeMail () {
    return Promise.resolve({'msg': 'no mailer configured'});
  }
};

if (cfg.mailer_url && cfg.mailer_url.trim() !== '') {
  let fs = require('fs'),
    request = require('request-promise');

  let requestMailer = (payload) => {
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
      let script = fs.readFileSync(cfg.targetFolder + '' + box._id + '.ino', 'utf-8');

      // this is the payload sent to the mailing daemon
      let payload = [
        {
          template: 'registration',
          // lang: user.language,
          lang: 'de',
          recipient: {
            address: user.email,
            name: user.firstname + ' ' + user.lastname
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
        },
        {
          template: 'yeah',
          lang: 'de',
          recipient: {
            address: 'info@sensebox.de',
            name: 'senseBox Support'
          },
          payload: {
            box: {
              id: box._id
            },
            origin: cfg.mailer_origin
          }
        }
      ];

      return requestMailer(payload)
        .then((response) => {
          console.log('successfully sent mails: ' + JSON.stringify(response));
        })
        .catch((err) => {
          Honeybadger.notify(err);
          console.error(err);
        });
    }
  };
}

