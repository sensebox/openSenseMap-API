
'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect,
  $ = require('cheerio'),
  mimelib = require("mimelib");

const BASE_URL = 'http://localhost:8000',
  valid_user = require('./data/valid_user');

describe('mails', function () {
  it('confirm email address', function () {
    return chakram.get('http://mailhog:8025/api/v2/messages')
      .then(function (response) {
        let token;
        expect(response).to.have.status(200);
        expect(response).to.have.json('items', function (items) {
          expect(items.some(function (item) {
            if (item.Raw.To[0] === valid_user.email && item.Content.Headers.Subject.includes('Your openSenseMap registration')) {
              const links = $.load(mimelib.decodeQuotedPrintable(item.Content.Body))('a');
              links.each(function (_, link) {
                const href = $(link).attr('href');
                if (href.includes('token=')) {
                  token = href.split('=')[1];
                }
              });

              return true;
            }

            return false;
          })).to.be.true;

        });

        return chakram.post(`${BASE_URL}/users/confirm-email`, { token, email: valid_user.email });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.json({ code: 'Ok', message: 'E-Mail successfully confirmed. Thank you' });

        return chakram.wait();
      });
  });
});
