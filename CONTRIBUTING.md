# Contributing

We are generally open for contributions! If you feel you are able to provide improvements or bug fixes by yourself, please do so by forking the repository and creating a [pull request]. Otherwise feel free to create an [issue].

## A note on organization of the repository

The [openSenseMap-API](https://github.com/sensebox/openSenseMap-API) repository contains both the code for the actual API and the database models powering the API and other projects. You will find both in the `packages` folder.

Please separate commits between API and models by prepending the commit messages with `(models)` or `(api)`.

## Local development

Make sure you have the following tools installed:

- Docker
- Docker Compose
- Node.Js v14
- Yarn package manager

Fork, then clone the repo:

    git clone git@github.com:your-username/openSenseMap-API.git

To install all dependencies, run

    yarn

### Starting the project locally

Before starting the development database, create the following network

    docker network create api-db-network

Afterwards, start your development database

    docker-compose up -d

Then run the api

    yarn start

### Making changes

At this point, you can make changes to your code and run the tests with

    yarn run test

If you added or removed dependencies, run

    yarn run test build

Make sure the tests pass:

    yarn run test

Make your change. Add tests for your change. Make the tests pass:

    yarn run test

Also run the linter and fix possible linting issues with your code:

    yarn run lint

Ideally, building a docker image should succeed:

    docker build -t your-username/opensensemap-api .

Document your changes in the respective `CHANGELOG.md`.

Push to your fork and submit [pull request] against `master` branch.

### Good contributions

After this, we will check your code and see if your contribution works for us. We may suggest some changes or improvements or alternatives.

Ideally your pull request should include these things:

- Tests for the things you've added/changed
- Good documentation / Comments in the code
- Self explanatory commit messages

[issue]: https://github.com/sensebox/openSenseMap-API/issues/new
[pull request]: https://github.com/sensebox/openSenseMap-API/compare/
