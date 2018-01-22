# @sensebox/opensensemap-api-models
Data models and database connection for openSenseMap

[![NPM Version](https://img.shields.io/npm/v/@sensebox/opensensemap-api-models.svg)](https://www.npmjs.com/package/@sensebox/opensensemap-api-models)

## `require()` openSenseMap API models

Install it as dependency: `npm install --save @sensebox/opensensemap-api-models` or `yarn add @sensebox/opensensemap-api-models`

This allows you to use parts like models and decoding in your own project. See `index.js`.

## Configuration

The package uses [lorenwest/node-config](https://github.com/lorenwest/node-config). The available configuration keys can be found in the [`index.js`](index.js) file. If you need an example for configuring the package, take a look at the [`docker-compose.yml`](../../tests/docker-compose.yml) file of the api tests.

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md)

#### Releasing a new version
1. Document your changes in [`CHANGELOG.md`](CHANGELOG.md). Do not `git add` the file.
1. Run `yarn version`
1. `git push origin master`
1. `npm publish`
1. Use the new version in the api package

## License

[MIT](license.md) - Matthias Pfeil 2015 - now

Maintained by Gerald Pape
