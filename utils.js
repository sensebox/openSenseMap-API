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
  config: cfg,
  Honeybadger: Honeybadger
};
