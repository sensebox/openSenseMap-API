'use strict';

module.exports = {
  env: {
    es6: true,
    node: true
  },
  extends: ['@sensebox/eslint-config-sensebox'],
  rules: {
    complexity: ['warn', 20]
  }
};
