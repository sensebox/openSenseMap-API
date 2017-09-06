# openSenseMap API

[openSenseMap] is part of the [senseBox] project. To get more information about openSenseMap and senseBox visit the before mentioned links or have a look at this [video](https://www.youtube.com/watch?v=uTOWYa42_rI), read the [API docs](https://docs.opensensemap.org) or the [openSenseMap](https://osem.books.sensebox.de/) chapter in our [books](https://books.sensebox.de/).

## Organization

This repository is a monorepo for the packages

- [![@sensebox/opensensemap-api-models NPM Version](https://img.shields.io/npm/v/@sensebox/opensensemap-api-models.svg)](https://www.npmjs.com/package/@sensebox/opensensemap-api-models) [@sensebox/opensensemap-api-models](models) The data models and database connection of openSenseMap.
- [![@sensebox/opensensemap-api NPM Version](https://img.shields.io/npm/v/@sensebox/opensensemap-api.svg)](https://www.npmjs.com/package/@sensebox/opensensemap-api) [@sensebox/opensensemap-api](api) The REST API used by [https://opensensemap.org](https://opensensemap.org) running at [https://api.opensensemap.org](https://api.opensensemap.org).

### Directories
- root directory
  - not published on NPM
  - is used to build a Docker container image
  - contains tests (run with `./run-tests`)
- [api](api) directory
  - NPM [@sensebox/opensensemap-api](https://www.npmjs.com/package/@sensebox/opensensemap-api)
  - [Changelog](api/CHANGELOG.md)
  - should not appear as dependency of other packages
- [models](models) directory
  - NPM [@sensebox/opensensemap-api-models](https://www.npmjs.com/package/@sensebox/opensensemap-api-models)
  - [Changelog](models/CHANGELOG.md)
  - `require('@sensebox/opensensemap-api-models')` for access to data models

### Branches
- master (runs in production)
  - Is never used to publish versions of subpackages
  - [package.json](package.json) contains specific versions from NPM
  - Is used for container build tags
- development (runs on testing server)
  - Releases for subpackages are done from here
  - [package.json](package.json) contains `file:./api` and `file:./models` as versions
- gh-pages
  - Hosts API docs for [https://docs.opensensemap.org/](https://docs.opensensemap.org/)
  - Is generated and pushed to github by Travis CI [![sensebox/openSenseMap-API Build Status](https://travis-ci.org/sensebox/openSenseMap-API.svg?branch=master)](https://travis-ci.org/sensebox/openSenseMap-API)

### Tags and Versions
Git Tags are used for:
- Docker hub builds `dockerhub-v1`. Version number is increased by one for each new version.
- NPM tags for subpackages. [Uses Semantic Versioning 2.0.0](http://semver.org/spec/v2.0.0.html)
  - `@sensebox/opensensemap-api-v1.0.0`
  - `@sensebox/opensensemap-api-models-v1.0.0`

### Release new NPM versions
Make sure you've documented your changes in the `CHANGELOG.md` file of the respective package and have comitted everything to the development branch.

To create a new NPM version, use `npm version`.
1. Have everything commited for the release
1. Document your changes in `CHANGELOG.md` under `## Unreleased`. Do not `git add` the file
1. Run `npm version [ major | minor | patch ] -m "[<PACKAGENAME>-v%s] <Your commit message>"`
1. `git push origin development`
1. `npm publish`

### Docker container images
#### Development images
Every commit on branch `development` will be built with the tag `development`. Versions of `@sensebox/opensensemap-api` and `@sensebox/opensensemap-api-models` will be the current development snapshot.

#### Versioned container images
- Check out `master` branch
- Go to root directory
- Modify version of `@sensebox/opensensemap-api` and `@sensebox/opensensemap-api-models` to desired versions
- Make sure versions of `@sensebox/opensensemap-api` and `@sensebox/opensensemap-api-models` are published on NPM
- Optional
  - Run tests
  - Build docker image locally
- Run `yarn` to update `yarn.lock`
- Commit `package.json` and `yarn.lock`
- Run `npm run tag-container`
- Run `git push origin master`
- Docker images are built automatically by the Docker hub for all tags starting with `dockerhub-v`

## Development
- Have [Node.js] v6, [yarn](https://yarnpkg.com/), [Docker](https://docs.docker.com/engine/installation/) and [docker-compose](https://docs.docker.com/compose/install/) installed
- Go to the subdirectory in which you want to develop
- Only for [api](api): Run `yarn install`
- Start your development database (`docker-compose up -d db`)

## Running Tests
You can run the tests in containers using Docker and docker-compose.
```
# Only run this once or every time you change dependencies in package.json
./run-tests.sh build

./run-tests.sh
```

## Running the API
### Configuration
These packages read their configuration either from their respective `src/config.js` file or environment variables starting with `OSEM_`. Environment variables override values in `src/config.js`.

### Container based
The repository [OSeM-compose](https://github.com/sensebox/osem-compose) contains a deployment of all services with docker compose. The image built from this repository is called [`sensebox/opensensemap-api`](https://hub.docker.com/r/sensebox/opensensemap-api/).

[openSenseMap]:https://opensensemap.org/
[senseBox]:https://sensebox.de/
