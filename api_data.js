define({ "api": [
  {
    "type": "delete",
    "url": "/boxes/:boxId",
    "title": "Delete a senseBox and its measurements",
    "name": "deleteBox",
    "group": "Boxes",
    "version": "0.1.0",
    "filename": "./app.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "get",
    "url": "/boxes?date=:date&phenomenon=:phenomenon",
    "title": "Get all senseBoxes. With the optional `date` and `phenomenon` parameters you can find senseBoxes that have submitted data around that time, +/- 2 hours, or specify two dates separated by a comma.",
    "name": "findAllBoxes",
    "group": "Boxes",
    "version": "0.1.0",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "date",
            "description": "<p>A date or datetime (UTC) where a station should provide measurements. Use in combination with <code>phenomenon</code>.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phenomenon",
            "description": "<p>A sensor phenomenon (determined by sensor name) such as temperature, humidity or UV intensity. Use in combination with <code>date</code>.</p>"
          }
        ]
      }
    },
    "sampleRequest": [
      {
        "url": "http://opensensemap.org:8000/boxes"
      },
      {
        "url": "http://opensensemap.org:8000/boxes?date=2015-03-07T02:50Z&phenomenon=Temperatur"
      },
      {
        "url": "http://opensensemap.org:8000/boxes?date=2015-03-07T02:50Z,2015-04-07T02:50Z&phenomenon=Temperatur"
      }
    ],
    "filename": "./app.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "get",
    "url": "/boxes/:boxId",
    "title": "Get one senseBox",
    "name": "findBox",
    "version": "0.0.1",
    "group": "Boxes",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "ID",
            "optional": false,
            "field": "boxId",
            "description": "<p>senseBox unique ID.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "_id",
            "description": "<p>senseBox unique ID.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "boxType",
            "description": "<p>senseBox type (fixed or mobile).</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "sensors",
            "description": "<p>All attached sensors.</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "loc",
            "description": "<p>Location of senseBox.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Example data on success:",
          "content": "{\n  \"_id\": \"5386e44d5f08822009b8b614\",\n  \"name\": \"PHOBOS\",\n  \"boxType\": \"fixed\",\n  \"sensors\": [\n    {\n      \"_id\": \"5386e44d5f08822009b8b615\",\n      \"boxes_id\": \"5386e44d5f08822009b8b614\",\n      \"lastMeasurement\": {\n        \"_id\": \"5388d07f5f08822009b937b7\",\n        \"createdAt\": \"2014-05-30T18:39:59.353Z\",\n        \"updatedAt\": \"2014-05-30T18:39:59.353Z\",\n        \"value\": \"584\",\n        \"sensor_id\": \"5386e44d5f08822009b8b615\",\n      },\n      \"sensorType\": \"GL5528\",\n      \"title\": \"Helligkeit\",\n      \"unit\": \"Pegel\"\n    }\n  ],\n  \"loc\": [\n    {\n      \"_id\": \"5386e44d5f08822009b8b61a\",\n      \"geometry\": {\n        \"coordinates\": [\n          10.54555893642828,\n          49.61361673283691\n        ],\n        \"type\": \"Point\"\n      },\n      \"type\": \"feature\"\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./app.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "get",
    "url": "/boxes/:boxId/script",
    "title": "Download the Arduino script for your senseBox",
    "name": "getScript",
    "group": "Boxes",
    "version": "0.1.0",
    "filename": "./app.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "post",
    "url": "/boxes",
    "title": "Post new senseBox",
    "description": "<p>Create a new senseBox.</p>",
    "version": "0.0.1",
    "group": "Boxes",
    "name": "postNewBox",
    "filename": "./app.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "put",
    "url": "/boxes/:senseBoxId",
    "title": "Update a senseBox: Image and sensor names",
    "description": "<p>Modify the specified senseBox.</p>",
    "sampleRequest": [
      {
        "url": "{\n \"_id\": \"56e741ff933e450c0fe2f705\",\n \"name\": \"MeineBox\",\n \"sensors\": [\n   {\n     \"_id\": \"56e741ff933e450c0fe2f707\",\n     \"title\": \"UV-Intensität\",\n     \"unit\": \"μW/cm²\",\n     \"sensorType\": \"VEML6070\",\n   }\n ],\n \"grouptag\": \"vcxyxsdf\",\n \"exposure\": \"outdoor\",\n \"loc\": {\n   \"lng\": 8.6956,\n   \"lat\": 50.0430\n }\n}"
      }
    ],
    "version": "0.0.1",
    "group": "Boxes",
    "name": "updateBox",
    "filename": "./app.js",
    "groupTitle": "Boxes",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "x-APIKey",
            "description": "<p>the secret API key which corresponds to the <code>senseBoxId</code> parameter.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "x-APIKey header example:",
          "content": "x-APIKey: 576efef4cb9b9ebe057bf7b4",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "Object",
            "optional": false,
            "field": "403",
            "description": "<p>the request has invalid or missing credentials.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 403 Forbidden\n{\"code\":\"NotAuthorized\",\"message\":\"ApiKey is invalid or missing\"}",
          "type": "json"
        }
      ]
    },
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/users/:senseBoxId",
    "title": "Validate authorization",
    "group": "Boxes",
    "description": "<p>Validate authorization through API key and senseBoxId. Will return status code 403 if invalid, 200 if valid.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "Response",
            "description": "<p>ApiKey is valid</p>"
          }
        ]
      }
    },
    "version": "0.0.1",
    "name": "validApiKey",
    "filename": "./app.js",
    "groupTitle": "Boxes",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "x-APIKey",
            "description": "<p>the secret API key which corresponds to the <code>senseBoxId</code> parameter.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "x-APIKey header example:",
          "content": "x-APIKey: 576efef4cb9b9ebe057bf7b4",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "Object",
            "optional": false,
            "field": "403",
            "description": "<p>the request has invalid or missing credentials.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 403 Forbidden\n{\"code\":\"NotAuthorized\",\"message\":\"ApiKey is invalid or missing\"}",
          "type": "json"
        }
      ]
    },
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/boxes/:senseBoxId/data/:sensorId?from-date=:fromDate&to-date:toDate",
    "title": "Get last n measurements for a sensor",
    "description": "<p>Get up to 10000 measurements from a sensor for a specific time frame, parameters <code>from-date</code> and <code>to-date</code> are optional. If not set, the last 24 hours are used. The maximum time frame is 1 month. A maxmimum of 1000 values wil be returned for each request.</p>",
    "version": "0.0.1",
    "group": "Measurements",
    "name": "getData",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "from-date",
            "description": "<p>Beginning date of measurement data (default: 48 hours ago from now)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "to-date",
            "description": "<p>End date of measurement data (default: now)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "download",
            "description": "<p>If set, offer download to the user (default: false, always on if CSV is used)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "format",
            "description": "<p>Can be 'JSON' (default) or 'CSV' (default: JSON)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "sensorId",
            "description": "<p>the ID of the sensor you are referring to.</p>"
          }
        ]
      }
    },
    "filename": "./app.js",
    "groupTitle": "Measurements"
  },
  {
    "type": "get,post",
    "url": "/boxes/data?boxid=:boxIdsfrom-date=:fromDate&to-date:toDate&phenomenon=:phenomenon",
    "title": "Get last n measurements for a sensor",
    "description": "<p>Download data from multiple boxes as CSV</p>",
    "version": "0.1.0",
    "group": "Measurements",
    "name": "getDataMulti",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "ID",
            "optional": false,
            "field": "boxId",
            "description": "<p>Comma separated list of senseBox unique IDs.</p>"
          }
        ]
      }
    },
    "filename": "./app.js",
    "groupTitle": "Measurements"
  },
  {
    "type": "get",
    "url": "/boxes/:senseBoxId/sensors",
    "title": "Get all last measurements",
    "description": "<p>Get last measurements of all sensors of the specified senseBox.</p>",
    "version": "0.0.1",
    "group": "Measurements",
    "name": "getMeasurements",
    "filename": "./app.js",
    "groupTitle": "Measurements",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/boxes/:boxId/:sensorId",
    "title": "Post new measurement",
    "description": "<p>Posts a new measurement to a specific sensor of a box.</p>",
    "version": "0.0.1",
    "group": "Measurements",
    "name": "postNewMeasurement",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "ID",
            "optional": false,
            "field": "boxId",
            "description": "<p>senseBox unique ID.</p>"
          },
          {
            "group": "Parameter",
            "type": "ID",
            "optional": false,
            "field": "sensorId",
            "description": "<p>Sensors unique ID.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "curl --data value=22 localhost:8000/boxes/56ccb342eda956582a88e48c/56ccb342eda956582a88e490",
          "type": "json"
        }
      ]
    },
    "filename": "./app.js",
    "groupTitle": "Measurements"
  },
  {
    "type": "post",
    "url": "/boxes/:boxId/data",
    "title": "Post multiple new measurements",
    "description": "<p>Post multiple new measurements as an JSON array to a box.</p>",
    "version": "0.1.0",
    "group": "Measurements",
    "name": "postNewMeasurements",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "ID",
            "optional": false,
            "field": "boxId",
            "description": "<p>senseBox unique ID.</p>"
          }
        ]
      }
    },
    "sampleRequest": [
      {
        "url": "[{ \"sensor\": \"56cb7c25b66992a02fe389de\", \"value\": \"3\" },{ \"sensor\": \"56cb7c25b66992a02fe389df\", \"value\": \"2\" }]\ncurl -X POST -H 'Content-type:application/json' -d \"[{ \\\"sensor\\\": \\\"56cb7c25b66992a02fe389de\\\", \\\"value\\\": \\\"3\\\" },{ \\\"sensor\\\": \\\"56cb7c25b66992a02fe389df\\\", \\\"value\\\": \\\"2\\\" }]\" localhost:8000/boxes/56cb7c25b66992a02fe389d9/data"
      }
    ],
    "filename": "./app.js",
    "groupTitle": "Measurements"
  },
  {
    "type": "get",
    "url": "/boxes/stats",
    "title": "Get some statistics about the database",
    "description": "<p>8 boxes, 13 measurements in the database, 2 in the last minute</p>",
    "name": "getStatistics",
    "group": "misc",
    "version": "0.1.0",
    "success": {
      "examples": [
        {
          "title": "[8,13, 2]",
          "content": "[8,13, 2]",
          "type": "json"
        }
      ]
    },
    "filename": "./app.js",
    "groupTitle": "misc"
  }
] });
