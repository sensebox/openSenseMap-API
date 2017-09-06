# @sensebox/opensensemap-api

This package contains the HTTP REST API for the openSenseMap. Originally, this API has been built as part the bachelor thesis of [@mpfeil](https://github.com/mpfeil) at the ifgi (Institute for Geoinformatics, WWU Münster).

The package should never be required by any other package. If you want to use the openSenseMap models, look at [@sensebox/opensensemap-api-models](../models).

## Development

- Install Docker, Node.js v6, yarn
- Run `yarn` in this directory
- Run development database `docker-compose up -d db`

Also see [README](../README.md)


## Create the API documentation pages

To create the documentation you need [apidocjs](http://apidocjs.com/) and run:
```
apidoc -e node_modules/
```

## Technologies

* [Node.js]
* [MongoDB]

## License

[MIT](license.md) - Matthias Pfeil 2015 - 2017

[Node.js]:http://nodejs.org/
[MongoDB]:http://www.mongodb.com/
