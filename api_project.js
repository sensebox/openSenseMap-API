define({
  "name": "",
  "version": "11.2.0",
  "description": "",
  "title": "openSenseMap API documentation",
  "url": "https://api.opensensemap.org",
  "order": [
    "register",
    "getBox",
    "getBoxes",
    "postNewBox",
    "updateBox",
    "deleteBox",
    "getScript",
    "postNewMeasurement",
    "getMeasurements",
    "getData",
    "calculateIdw"
  ],
  "template": {
    "withCompare": false
  },
  "header": {
    "title": "Introduction",
    "content": "<p><img src=\"https://raw.githubusercontent.com/sensebox/resources/master/images/openSenseMap_API_github.png\" alt=\"openSenseMap API\"> v11.3.0</p>\n<p><br />Documentation of the routes and methods to manage <a href=\"#api-Users\">users</a>, <a href=\"#api-Boxes\">stations (also called boxes or senseBoxes)</a>, and <a href=\"#api-Measurements\">measurements</a> in the openSenseMap API.\nYou can find the API running at <a href=\"https://api.opensensemap.org/\">https://api.opensensemap.org/</a>.</p>\n<h2>Timestamps</h2>\n<p>Please note that the API handles every timestamp in <a href=\"https://en.wikipedia.org/wiki/Coordinated_Universal_Time\">Coordinated universal time (UTC)</a> time zone. Timestamps in parameters should be in RFC 3339 notation.</p>\n<p>Timestamp without Milliseconds:</p>\n<pre><code>2018-02-01T23:18:02Z\n</code></pre>\n<p>Timestamp with Milliseconds:</p>\n<pre><code>2018-02-01T23:18:02.412Z\n</code></pre>\n<h2>IDs</h2>\n<p>All stations and sensors of stations receive a unique public identifier. These identifiers are exactly 24 character long and only contain digits and characters a to f.</p>\n<p>Example:</p>\n<pre><code>5a8d1c25bc2d41001927a265\n</code></pre>\n<h2>Parameters</h2>\n<p>Only if noted otherwise, all requests assume the payload encoded as JSON with <code>Content-type: application/json</code> header. Parameters prepended with a colon (<code>:</code>) are parameters which should be specified through the URL.</p>\n<h2>Source code and Licenses</h2>\n<p>You can find the whole source code of the API at GitHub in the <a href=\"https://github.com/sensebox/openSenseMap-API\">sensebox/openSenseMap-API</a> repository. You can obtain the code under the MIT License.</p>\n<p>The data obtainable through the openSenseMap API at <a href=\"https://api.opensensemap.org/\">https://api.opensensemap.org/</a> is licensed under the <a href=\"https://opendatacommons.org/licenses/pddl/summary/\">Public Domain Dedication and License 1.0</a>.</p>\n<p>If you there is something unclear or there is a mistake in this documentation please open an <a href=\"https://github.com/sensebox/openSenseMap-API/issues/new\">issue</a> in the GitHub repository.</p>\n"
  },
  "sampleUrl": false,
  "defaultVersion": "0.0.0",
  "apidoc": "0.3.0",
  "generator": {
    "name": "apidoc",
    "time": "2024-08-09T08:19:07.135Z",
    "url": "http://apidocjs.com",
    "version": "0.17.6"
  }
});
