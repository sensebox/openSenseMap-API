openSenseMap-API
================

[![Join the chat at https://gitter.im/sensebox/openSenseMap-API](https://badges.gitter.im/sensebox/openSenseMap-API.svg)](https://gitter.im/sensebox/openSenseMap-API?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
This is the back-end for [openSenseMap](https://opensensemap.org).

openSenseMap is part of the [senseBox](https://sensebox.de) project.
To get more information about openSenseMap and senseBox visit the before mentioned links or have a look at this [video](https://www.youtube.com/watch?v=uTOWYa42_rI).

Originally, this API has been built as part the bachelor thesis of @mpfeil at the ifgi (Institute for Geoinformatics, WWU Münster).

### Technologies

* [node.js]
* [MongoDB]

### Development

#### Node.js
It is assumed that you have installed node.js Version 6 LTS. Install dependencies with [yarn](https://yarnpkg.com/)
```
yarn install
```

There are several config keys in `config/index.js`. These can also be configured through environment keys. Just prefix your environment keys with `OSEM_` to be read by the api.

#### Database
The API needs a running MongoDB instance with a `OSeM-api` database and credentials.

The best way to run the database for development is to use the supplied `docker-compose.yml` and run
```
docker-compose up -d db
```

### `require()` openSenseMap-API for other projects

You can require several parts of the API in other projects.

Install it as dependency
```
# for specific branch/commit/tag append #<branch/commit/tag>
yarn add git://github.com/sensebox/openSenseMap-API.git
```

This allows you to use parts like models and decoding in your own project. See `index.js`.

### Create the JSDoc pages

To create the documentation you need [apidocjs](http://apidocjs.com/) and run:
```
apidoc -e node_modules/
```

### Running Tests
You can run the tests in containers using docker and docker-compose.
```
# Only run this once or every time you change dependencies in package.json
docker-compose -p osemapitest -f tests-docker-compose.yml build osem-api

./run-tests.sh
```

### Running in Production

Look at the [OSeM-compose](https://github.com/sensebox/osem-compose) repository. It contains a deployment with docker compose.

### License

[MIT](license.md) - Matthias Pfeil 2015 - 2017

[node.js]:http://nodejs.org/
[MongoDB]:http://www.mongodb.com/
