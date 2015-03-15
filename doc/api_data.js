define({ "api": [
  {
    "type": "get",
    "url": "/boxes",
    "title": "Get all SenseBoxes",
    "name": "findAllBoxes",
    "group": "Boxes",
    "version": "0.0.1",
    "sampleRequest": [
      {
        "url": "http://opensensemap.org:8000/boxes"
      }
    ],
    "filename": "./app.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "get",
    "url": "/boxes/:boxId",
    "title": "Get one SenseBox",
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
            "description": "<p>SenseBox unique ID.</p> "
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
            "description": "<p>SenseBox unique ID.</p> "
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "boxType",
            "description": "<p>SenseBox type (fixed or mobile).</p> "
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "sensors",
            "description": "<p>All attached sensors.</p> "
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "loc",
            "description": "<p>Location of SenseBox.</p> "
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
    "type": "post",
    "url": "/boxes",
    "title": "Post new SenseBox",
    "description": "<p>Create a new SenseBox.</p> ",
    "version": "0.0.1",
    "group": "Boxes",
    "name": "postNewBox",
    "filename": "./app.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "put",
    "url": "/boxes/:boxId",
    "title": "Update a SenseBox",
    "description": "<p>Modify the specified SenseBox.</p> ",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "ID",
            "optional": false,
            "field": "boxId",
            "description": "<p>SenseBox unique ID.</p> "
          }
        ]
      }
    },
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "ObjectId",
            "optional": false,
            "field": "x-apikey",
            "description": "<p>SenseBox specific apikey</p> "
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  'X-ApiKey':54d3a96d5438b4440913434b\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.1",
    "group": "Boxes",
    "name": "updateBox",
    "filename": "./app.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "get",
    "url": "/boxes/:boxId/sensors",
    "title": "Get all last measurements",
    "description": "<p>Get last measurements of all sensors of the secified SenseBox.</p> ",
    "version": "0.0.1",
    "group": "Measurements",
    "name": "getMeasurements",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "ID",
            "optional": false,
            "field": "boxId",
            "description": "<p>SenseBox unique ID.</p> "
          }
        ]
      }
    },
    "filename": "./app.js",
    "groupTitle": "Measurements"
  },
  {
    "type": "post",
    "url": "/boxes/:boxId/:sensorId",
    "title": "Post new measurement",
    "description": "<p>Posts a new measurement to a specific sensor of a box.</p> ",
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
            "description": "<p>SenseBox unique ID.</p> "
          },
          {
            "group": "Parameter",
            "type": "ID",
            "optional": false,
            "field": "sensorId",
            "description": "<p>Sensors unique ID.</p> "
          }
        ]
      }
    },
    "filename": "./app.js",
    "groupTitle": "Measurements"
  },
  {
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "optional": false,
            "field": "varname1",
            "description": "<p>No type.</p> "
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "varname2",
            "description": "<p>With type.</p> "
          }
        ]
      }
    },
    "type": "",
    "url": "",
    "version": "0.0.0",
    "filename": "./doc/main.js",
    "group": "_Users_matze_Development_OpenSenseMap_API_doc_main_js",
    "groupTitle": "_Users_matze_Development_OpenSenseMap_API_doc_main_js",
    "name": ""
  }
] });