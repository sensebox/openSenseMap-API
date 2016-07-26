openSenseMap-API
================

[![Join the chat at https://gitter.im/sensebox/openSenseMap-API](https://badges.gitter.im/sensebox/openSenseMap-API.svg)](https://gitter.im/sensebox/openSenseMap-API?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
This is the back-end for [openSenseMap](http://opensensemap.org).

openSenseMap is part of the [senseBox](http//sensebox.de) project.
To get more information about openSenseBox and senseBox visit the before mentioned links or have a look at this [video](https://www.youtube.com/watch?v=uTOWYa42_rI).

The API has been built as part of my bachelor thesis at the ifgi (Institute for Geoinformatics, WWU Münster).

### Technologies

* [node.js]
* [MongoDB]

### Install dependencies (Ubuntu)

It is assumed that you have installed node.js (developed using 0.10.26).

Install MongoDB according to [the manual](http://docs.mongodb.org/manual/installation/) and create the database "OSeM-api".

The database schema will be created automatically upon data insertion and looks like this:
```
Database "OSeM-api"
  - Collections
    - boxes
    - measurements
    - users
```

### Run for Development & Production

Open the configuration file ```config/index.js``` and change settings accordingly.

|Variable name             | Explanation|
|--------------------------|---------------|
|```exports.targetFolder```|The folder where a generated Arduino sketch for each box will be saved upon registration|
|```exports.imageFolder``` |The folder where banner images for boxes are stored, should be in your htdocs (make sure read and write permissions are correct)|
|```exports.dbuser```      |MongoDB database user, leave empty if not configured|
|```exports.dbuserpass```  |MongoDB database password, leave empty if not configured|

After that, run the following command to install dependencies:

```npm install```

Then start the API process, press CTRL+C to stop:

```
node app.js
```

**or with Docker**
- install docker and docker-compose
- run `docker-compose up`

### Create the JSDoc pages

To create the documentation you need [apidocjs](http://apidocjs.com/) and run:
```
apidoc -e node_modules/
```

To push a new Version to gh-pages run:
```
git subtree push --prefix doc/ origin gh-pages
```

### License

[MIT](license.md) - Matthias Pfeil 2015

[node.js]:http://nodejs.org/
[MongoDB]:http://www.mongodb.com/
