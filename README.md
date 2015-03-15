OpenSenseMap-API
================
This is the back-end for [OpenSenseMap](http://opensensemap.org).

OpenSenseMap is part of the [SenseBox](http//sensebox.de) project.
To get more information about OpenSenseBox and SenseBox visit the before mentioned links or have a look at this [video](https://www.youtube.com/watch?v=uTOWYa42_rI).


The API has been built as part of my bachelor thesis at the ifgi (Institute for Geoinformatics, WWU Münster).


###Technologies

* [node.js]
* [MongoDB]


###Install dependencies (Ubuntu)

It is assumed that you have installed node.js (developed using 0.10.26)
```
sudo apt-get install mongodb

```


###Run for Development & Production
Specify dbuser & dbuserpass in ```config/index.js```

```
npm install
node app.js

```


###Create the JSDoc pages

To create the documentation you need [apidocjs](http://apidocjs.com/) and run:
```
apidoc -e node_modules/
```

To push a new Version to gh-pages run:
```
git subtree push --prefix doc/ origin gh-pages
```


###License

[MIT](license.md) - Matthias Pfeil 2015

[node.js]:http://nodejs.org/
[MongoDB]:http://www.mongodb.com/