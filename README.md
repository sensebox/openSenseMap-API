![openSenseMap API](https://raw.githubusercontent.com/sensebox/resources/master/images/openSenseMap_API_github.png)

This repository contains the code of the openSenseMap API, which is the HTTP REST API used by [https://opensensemap.org](https://opensensemap.org) running at [https://api.opensensemap.org](https://api.opensensemap.org). To get more information about openSenseMap and senseBox visit the before mentioned links or have a look at this [video](https://www.youtube.com/watch?v=uTOWYa42_rI), read the [API docs](https://docs.opensensemap.org) or the [openSenseMap](https://osem.books.sensebox.de/) chapter in our [books](https://books.sensebox.de/). openSenseMap is part of the [senseBox] project.

Originally, this API has been built as part of the bachelor thesis of [@mpfeil](https://github.com/mpfeil) at the ifgi (Institute for Geoinformatics, WWU Münster) and is currently maintained by [@ubergesundheit](https://github.com/ubergesundheit).

You'll find that the repostiory uses yarn workspaces to separate the [API](packages/api) and the [database models](packages/models) for reuse in other projects. While the API is not published on npm, the package [`@sensebox/opensensemap-api-models`](https://www.npmjs.com/package/@sensebox/opensensemap-api-models) is published from [packages/models](packages/models) folder.

## Configuration

Configuration of both the api and the models is done using mechanisms provided by [lorenwest/node-config](https://github.com/lorenwest/node-config). You can find an annotated example configuration with all keys in [`config/config.example.json`](config/config.example.json).

## Development
- Have [Node.js] v8, [yarn](https://yarnpkg.com/), [Docker](https://docs.docker.com/engine/installation/) and [docker-compose](https://docs.docker.com/compose/install/) installed
- Start your development database (`docker-compose up -d db`)
- Check out `development` branch (`git checkout development`)
- Run `yarn install`
- Create your own branch `git checkout -b my-awesome-branch`
- Commit your changes to your branch and push it to your fork
- Create a pull request against the `development` branch

See also: [CONTRIBUTING](CONTRIBUTING.md)

## Running Tests
You can run the tests in containers using Docker and docker-compose.
```
# Run this the first time or every time you change dependencies in package.json
yarn install
yarn test build

yarn test
```

## Related projects

### Services
- [openSenseMap Frontend](https://github.com/sensebox/openSenseMap)
- [ttn-osem-integration](https://github.com/sensebox/ttn-osem-integration)
- [mqtt-osem-integration](https://github.com/sensebox/mqtt-osem-integration)
- [sensebox-mailer](https://github.com/sensebox/sensebox-mailer)

### Libraries
- [sketch-templater](https://github.com/sensebox/node-sketch-templater)
- [openSenseMap-API-models](https://github.com/sensebox/openSenseMap-API/tree/master/packages/models)

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
- Run `yarn tag-container`
- Run `git push origin master`

## License

[MIT](license.md) - Matthias Pfeil 2015 - now

[Node.js]:http://nodejs.org/
[MongoDB]:http://www.mongodb.com/
[openSenseMap]:https://opensensemap.org/
[senseBox]:https://sensebox.de/
