'use strict';

module.exports = {
  env: {
    es6: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: {
      experimentalObjectRestSpread: true
    }
  },
  extends: ['@sensebox/eslint-config-sensebox', 'prettier'],
  rules: {
    'no-loss-of-precision': ['warn'],
    complexity: ['warn', 20]
  }
};
