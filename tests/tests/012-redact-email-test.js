'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect,
  { redactEmail } = require('../../packages/api/lib/helpers/apiUtils');


describe('redact email tests', function () {
  it('should redact email@server.com to ema****@ser****.c**', function () {
    expect(redactEmail('email@server.com')).to.equal('ema****@ser****.c**');
  });

  it('should redact verylongemail@verylongdomain.de to ver****@ver****.d**', function () {
    expect(redactEmail('verylongemail@verylongdomain.de')).to.equal('ver****@ver****.d**');
  });

  it('should redact a@a.a to a****@a****.a**', function () {
    expect(redactEmail('a@a.a')).to.equal('a****@a****.a**');
  });
});
