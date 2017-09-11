![openSenseMap API](https://raw.githubusercontent.com/sensebox/resources/master/images/openSenseMap_API_github.png)

[![sensebox/openSenseMap-API Build Status](https://travis-ci.org/sensebox/openSenseMap-API.svg?branch=master)](https://travis-ci.org/sensebox/openSenseMap-API)

This repository contains the Node.js package [@sensebox/opensensemap-api](https://www.npmjs.com/package/@sensebox/opensensemap-api), which is the HTTP REST API used by [https://opensensemap.org](https://opensensemap.org) running at [https://api.opensensemap.org](https://api.opensensemap.org). To get more information about openSenseMap and senseBox visit the before mentioned links or have a look at this [video](https://www.youtube.com/watch?v=uTOWYa42_rI), read the [API docs](https://docs.opensensemap.org) or the [openSenseMap](https://osem.books.sensebox.de/) chapter in our [books](https://books.sensebox.de/). openSenseMap is part of the [senseBox] project.

Originally, this API has been built as part of the bachelor thesis of [@mpfeil](https://github.com/mpfeil) at the ifgi (Institute for Geoinformatics, WWU Münster) and is currently maintained by [@ubergesundheit](https://github.com/ubergesundheit).

## Configuration
Configuration values reside in the `lib/config.js` file. Configuration can also be set through environment variables starting with `OSEM_`. Environment variables override values in `lib/config.js`.

## Development
- Have [Node.js] v6, [yarn](https://yarnpkg.com/), [Docker](https://docs.docker.com/engine/installation/) and [docker-compose](https://docs.docker.com/compose/install/) installed
- Start your development database (`docker-compose up -d db`)
- Check out `development` branch (`git checkout development`)
- Run `yarn install`
- Create your own branch `git checkout -b my-awesome-branch`
- Commit your changes to your branch and push it to your fork
- Create a pull request against the `development` branch

## Running Tests
You can run the tests in containers using Docker and docker-compose.
```
# Only run this once or every time you change dependencies in package.json
./run-tests.sh build

./run-tests.sh
```

## Related projects

### Services
- [openSenseMap Frontend](https://github.com/sensebox/openSenseMap)
- [ttn-osem-integration](https://github.com/sensebox/ttn-osem-integration)
- [openSenseMap-MQTT-client](https://github.com/sensebox/openSenseMap-MQTT-client)
- [sensebox-mailer](https://github.com/sensebox/sensebox-mailer)

### Libraries
- [sketch-templater](https://github.com/sensebox/node-sketch-templater)
- [openSenseMap-API-models](https://github.com/sensebox/openSenseMap-API-models)

### Deployment
- [OSeM-compose](https://github.com/sensebox/OSeM-compose)
- [openSenseMap-infrastructure](https://github.com/sensebox/openSenseMap-infrastructure)

## Technologies

* [Node.js]
* [MongoDB]

## Organization

### Branches
- master (runs in production)
  - Is used for container build tags
- development (runs on testing server)
  - Bleeding edge and possibly unstable development version
- gh-pages
  - Hosts API docs for [https://docs.opensensemap.org/](https://docs.opensensemap.org/)
  - Is generated and pushed to github by Travis CI

### Tags and Versions
Git Tags are used for Docker hub builds (like `v1`). Version number is increased by one for each new version. Docker images are built automatically by the Docker hub for all tags starting with `v`

#### Development container images
Every commit on branch `development` will be built with the tag `development`.

#### Versioned container images
- Check out `master` branch
- Go to root directory
- Run tests
- Optional: Build docker image locally
- Commit everything needed for the container image
- Run `npm run tag-container`
- Run `git push origin master`

## License

[MIT](license.md) - Matthias Pfeil 2015 - now

[Node.js]:http://nodejs.org/
[MongoDB]:http://www.mongodb.com/
[openSenseMap]:https://opensensemap.org/
[senseBox]:https://sensebox.de/
