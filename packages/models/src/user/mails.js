'use strict';

const config = require('config').get('openSenseMap-API-models.integrations'),
  log = require('../log');

const noMailerConfiguredFunc = function () {
  return Promise.resolve({ 'msg': 'no mailer configured' });
};

module.exports = {
  sendMail: noMailerConfiguredFunc
};

if (config.get('mailer.url')) {
  /* eslint-disable global-require */
  const got = require('got');
  /* eslint-enable global-require */

  const mailTemplates = {
    'newBox' (user, box) {
      return {
        payload: {
          box
        },
        attachment: {
          filename: 'senseBox.ino',
          contents: box.getSketch({ encoding: 'base64' })
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
    'resendEmailConfirmation' (user) {
      let addressToUse = user.email;
      if (user.unconfirmedEmail) {
        addressToUse = user.unconfirmedEmail;
      }

      return {
        recipient: {
          address: addressToUse,
          name: user.name
        },
        payload: {
          token: user.emailConfirmationToken,
          email: addressToUse
        }
      };
    },
    'newSketch' (user, box) {
      return {
        payload: {
          box
        },
        attachment: {
          filename: 'senseBox.ino',
          contents: box.getSketch({ encoding: 'base64' })
        }
      };
    },
    'deleteUser' () {
      return {};
    }
  };

  const requestMailer = (payload) => {
    return got(config.get('mailer.url'), {
      cert: config.get('cert'),
      key: config.get('key'),
      ca: config.get('ca_cert'),
      json: true,
      body: payload,
      ecdhCurve: 'auto'
    })
      .then((response) => {
        log.info({ msg: 'successfully sent mails', mailer_response: response.body, mailer_response_code: response.statusCode });

        return response;
      })
      .catch((err) => {
        throw err;
      });
  };

  module.exports = {
    sendMail (template, user, data) {
      if (!(template in mailTemplates)) {
        return Promise.reject(new Error(`template ${template} not implemented`));
      }

      const { payload = {}, attachment, recipient = { address: user.email, name: user.name } } = mailTemplates[template](user, data);

      // add user and origin to payload
      payload.user = user;
      payload.origin = config.get('mailer.origin');

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

