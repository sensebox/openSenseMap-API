# @sensebox/opensensemap-api-models
Data models and database connection for openSenseMap

## `require()` openSenseMap API models

Install it as dependency: `npm install --save @sensebox/opensensemap-api-models` or `yarn add @sensebox/opensensemap-api-models`

This allows you to use parts like models and decoding in your own project. See `index.js`.

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md)

#### Releasing a new version
On each commit, [Travis CI](https://travis-ci.org/sensebox/node-sketch-templater) builds and tests the package with this [`.travis.yml`](.travis.yml). If the commit has a Git tag, a new version of the package will be published to npm through travis.

To create a new version, use `npm version`.
1. Document your changes in [`CHANGELOG.md`](CHANGELOG.md). Do not `git add` the file.
1. Run `npm version [ major | minor | patch ] -m "[v%s] Your commit message"`
1. `git push origin master`
1. `npm publish`

## License

[MIT](license.md) - Matthias Pfeil 2015 - now
