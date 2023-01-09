'use strict';

/* eslint-disable global-require */
[
  '0-user',
  '1-box',
  '2-utils',
  '3-claim',
].forEach(t => require(`./tests/${t}`));
/* eslint-enable global-require */
