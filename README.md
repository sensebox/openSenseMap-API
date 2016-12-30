openSenseMap-API
================

[![Join the chat at https://gitter.im/sensebox/openSenseMap-API](https://badges.gitter.im/sensebox/openSenseMap-API.svg)](https://gitter.im/sensebox/openSenseMap-API?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
This is the back-end for [openSenseMap](http://opensensemap.org).

openSenseMap is part of the [senseBox](http//sensebox.de) project.
To get more information about openSenseBox and senseBox visit the before mentioned links or have a look at this [video](https://www.youtube.com/watch?v=uTOWYa42_rI).

Originally, this API has been built as part the bachelor thesis of @mpfeil at the ifgi (Institute for Geoinformatics, WWU Münster).

### Technologies

* [node.js]
* [MongoDB]

### Development

It is assumed that you have installed node.js. Version 6 LTS.

The best way to run the database for development is to use the supplied docker-compose.yml and run `docker-compose up -d db`.

There are several config keys in `config/index.js`. These can also be configured through environment keys. Just prefix your environment keys with `OSEM_` to be read by the api.

**or with Docker**
- install docker and docker-compose
- run `docker-compose up`

### Create the JSDoc pages

To create the documentation you need [apidocjs](http://apidocjs.com/) and run:
```
apidoc -e node_modules/
```

### License

[MIT](license.md) - Matthias Pfeil 2015 - 2016

[node.js]:http://nodejs.org/
[MongoDB]:http://www.mongodb.com/
