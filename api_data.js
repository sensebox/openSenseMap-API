define({ "api": [
  {
    "type": "delete",
    "url": "/boxes/:senseBoxId",
    "title": "Mark a senseBox and its measurements for deletion",
    "description": "<p>This will delete all the measurements of the senseBox. Please not that the deletion isn't happening immediately.</p>",
    "name": "deleteBox",
    "group": "Boxes",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>the current password for this user.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/boxesController.js",
    "groupTitle": "Boxes",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "allowedValues": [
              "\"application/json\"",
              "\"application/json; charset=utf-8\""
            ],
            "optional": false,
            "field": "content-type",
            "description": ""
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
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
            "field": "415",
            "description": "<p>the request has invalid or missing content type.</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 415 Unsupported Media Type\n{\"code\":\"NotAuthorized\",\"message\":\"Unsupported content-type. Try application/json\"}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/boxes/:senseBoxId?format=:format",
    "title": "Get one senseBox",
    "name": "getBox",
    "group": "Boxes",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "json",
              "geojson"
            ],
            "optional": true,
            "field": "format",
            "defaultValue": "json",
            "description": "<p>The format the sensor data is returned in. If <code>geojson</code>, a GeoJSON Point Feature is returned.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Example data on success:",
          "content": "{\n  \"_id\": \"57000b8745fd40c8196ad04c\",\n  \"createdAt\": \"2016-06-02T11:22:51.817Z\",\n  \"exposure\": \"outdoor\",\n  \"grouptag\": \"\",\n  \"image\": \"57000b8745fd40c8196ad04c.png?1466435154159\",\n  \"currentLocation\": {\n    \"coordinates\": [\n      7.64568,\n      51.962372\n    ],\n    \"timestamp\": \"2016-06-02T11:22:51.817Z\",\n    \"type\": \"Point\"\n  },\n  \"name\": \"Oststr/Mauritzsteinpfad\",\n  \"sensors\": [\n    {\n      \"_id\": \"57000b8745fd40c8196ad04e\",\n      \"lastMeasurement\": {\n        \"value\": \"0\",\n        \"createdAt\": \"2016-11-11T21:22:01.675Z\"\n      },\n      \"sensorType\": \"VEML6070\",\n      \"title\": \"UV-Intensität\",\n      \"unit\": \"μW/cm²\"\n    },\n    {\n      \"_id\": \"57000b8745fd40c8196ad04f\",\n      \"lastMeasurement\": {\n        \"value\": \"0\",\n        \"createdAt\": \"2016-11-11T21:22:01.675Z\"\n      },\n      \"sensorType\": \"TSL45315\",\n      \"title\": \"Beleuchtungsstärke\",\n      \"unit\": \"lx\"\n    },\n    {\n      \"_id\": \"57000b8745fd40c8196ad050\",\n      \"lastMeasurement\": {\n        \"value\": \"1019.21\",\n        \"createdAt\": \"2016-11-11T21:22:01.675Z\"\n      },\n      \"sensorType\": \"BMP280\",\n      \"title\": \"Luftdruck\",\n      \"unit\": \"hPa\"\n    },\n    {\n      \"_id\": \"57000b8745fd40c8196ad051\",\n      \"lastMeasurement\": {\n        \"value\": \"99.38\",\n        \"createdAt\": \"2016-11-11T21:22:01.675Z\"\n      },\n      \"sensorType\": \"HDC1008\",\n      \"title\": \"rel. Luftfeuchte\",\n      \"unit\": \"%\"\n    },\n    {\n      \"_id\": \"57000b8745fd40c8196ad052\",\n      \"lastMeasurement\": {\n        \"value\": \"0.21\",\n        \"createdAt\": \"2016-11-11T21:22:01.675Z\"\n      },\n      \"sensorType\": \"HDC1008\",\n      \"title\": \"Temperatur\",\n      \"unit\": \"°C\"\n    },\n    {\n      \"_id\": \"576996be6c521810002479dd\",\n      \"sensorType\": \"WiFi\",\n      \"unit\": \"dBm\",\n      \"title\": \"Wifi-Stärke\",\n      \"lastMeasurement\": {\n        \"value\": \"-66\",\n        \"createdAt\": \"2016-11-11T21:22:01.675Z\"\n      }\n    },\n    {\n      \"_id\": \"579f9eae68b4a2120069edc8\",\n      \"sensorType\": \"VCC\",\n      \"unit\": \"V\",\n      \"title\": \"Eingangsspannung\",\n      \"lastMeasurement\": {\n        \"value\": \"2.73\",\n        \"createdAt\": \"2016-11-11T21:22:01.675Z\"\n      },\n      \"icon\": \"osem-shock\"\n    }\n  ],\n  \"updatedAt\": \"2016-11-11T21:22:01.686Z\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/boxesController.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "get",
    "url": "/boxes/:senseBoxId/locations",
    "title": "Get locations of a senseBox",
    "group": "Boxes",
    "name": "getBoxLocations",
    "description": "<p>Get all locations of the specified senseBox ordered by date as an array of GeoJSON Points. If <code>format=geojson</code>, a GeoJSON linestring will be returned, with <code>properties.timestamps</code> being an array with the timestamp for each coordinate.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "json",
              "geojson"
            ],
            "optional": false,
            "field": "format",
            "defaultValue": "json",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "from-date",
            "description": "<p>Beginning date of location timestamps (default: 48 hours ago from now)</p>"
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "to-date",
            "description": "<p>End date of location timstamps (default: now)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Example response for :format=json",
          "content": "[\n  { \"coordinates\": [7.68123, 51.9123], \"type\": \"Point\", \"timestamp\": \"2017-07-27T12:00:00Z\"},\n  { \"coordinates\": [7.68223, 51.9433, 66.6], \"type\": \"Point\", \"timestamp\": \"2017-07-27T12:01:00Z\"},\n  { \"coordinates\": [7.68323, 51.9423], \"type\": \"Point\", \"timestamp\": \"2017-07-27T12:02:00Z\"}\n]",
          "type": "application/json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/boxesController.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "get",
    "url": "/boxes?date=:date&phenomenon=:phenomenon&format=:format",
    "title": "Get all senseBoxes",
    "description": "<p>With the optional <code>date</code> and <code>phenomenon</code> parameters you can find senseBoxes that have submitted data around that time, +/- 4 hours, or specify two dates separated by a comma.</p>",
    "name": "getBoxes",
    "group": "Boxes",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "date",
            "description": "<p>One or two RFC 3339 timestamps at which boxes should provide measurements. Use in combination with <code>phenomenon</code>.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "phenomenon",
            "description": "<p>A sensor phenomenon (determined by sensor name) such as temperature, humidity or UV intensity. Use in combination with <code>date</code>.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "json",
              "geojson"
            ],
            "optional": true,
            "field": "format",
            "defaultValue": "json",
            "description": "<p>the format the sensor data is returned in.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "grouptag",
            "description": "<p>only return boxes with this grouptag, allows to specify multiple separated with a comma</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"homeEthernet\"",
              "\"homeWifi\"",
              "\"homeEthernetFeinstaub\"",
              "\"homeWifiFeinstaub\"",
              "\"luftdaten_sds011\"",
              "\"luftdaten_sds011_dht11\"",
              "\"luftdaten_sds011_dht22\"",
              "\"luftdaten_sds011_bmp180\"",
              "\"luftdaten_sds011_bme280\""
            ],
            "optional": true,
            "field": "model",
            "description": "<p>only return boxes with this model, allows to specify multiple separated with a comma</p>"
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "allowedValues": [
              "\"true\"",
              "\"false\""
            ],
            "optional": true,
            "field": "classify",
            "defaultValue": "false",
            "description": "<p>if specified, the api will classify the boxes accordingly to their last measurements.</p>"
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "allowedValues": [
              "\"true\"",
              "\"false\""
            ],
            "optional": true,
            "field": "minimal",
            "defaultValue": "false",
            "description": "<p>if specified, the api will only return a minimal set of box metadata consisting of [_id, updatedAt, currentLocation, exposure, name] for a fast response.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"indoor\"",
              "\"outdoor\"",
              "\"mobile\"",
              "\"unknown\""
            ],
            "optional": true,
            "field": "exposure",
            "description": "<p>only include boxes with this exposure. Allows to specify multiple exposures separated by comma (Example: <code>indoor,mobile</code>)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "bbox",
            "description": "<p>A bounding box containing 4 WGS84 coordinates separated by comata (,). Order is: longitude southwest, latitude southwest, longitude northeast, latitude northeast. Minimal and maximal values are: -180, 180 for longitude and -90, 90 for latitude.</p>"
          }
        ]
      }
    },
    "sampleRequest": [
      {
        "url": "https://api.opensensemap.org/boxes"
      },
      {
        "url": "https://api.opensensemap.org/boxes?date=2015-03-07T02:50Z&phenomenon=Temperatur"
      },
      {
        "url": "https://api.opensensemap.org/boxes?date=2015-03-07T02:50Z,2015-04-07T02:50Z&phenomenon=Temperatur"
      }
    ],
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/boxesController.js",
    "groupTitle": "Boxes"
  },
  {
    "type": "get",
    "url": "/boxes/:senseBoxId/script",
    "title": "Download the Arduino script for your senseBox",
    "name": "getSketch",
    "group": "Boxes",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"Serial1\"",
              "\"Serial2\""
            ],
            "optional": false,
            "field": "serialPort",
            "description": "<p>the serial port the SDS011 sensor is connected to</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"A\"",
              "\"B\"",
              "\"C\""
            ],
            "optional": false,
            "field": "soilDigitalPort",
            "description": "<p>the digital port the SMT50 sensor is connected to</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"A\"",
              "\"B\"",
              "\"C\""
            ],
            "optional": false,
            "field": "soundMeterPort",
            "description": "<p>the digital port the soundlevelmeter sensor is connected to</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "ssid",
            "description": "<p>the ssid of your wifi network</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>the password of your wifi network</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/boxesController.js",
    "groupTitle": "Boxes",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/boxes",
    "title": "Post new senseBox",
    "group": "Boxes",
    "name": "postNewBox",
    "description": "<p>Create a new senseBox. This method allows you to submit a new senseBox.</p> <h3>MQTT Message formats</h3> <p>If you specify <code>mqtt</code> parameters, the openSenseMap API will try to connect to the MQTT broker specified by you. The parameter <code>messageFormat</code> tells the API in which format you are sending measurements in. The accepted formats are listed under <code>Measurements/Post mutliple new Measurements</code></p>",
    "parameter": {
      "fields": {
        "RequestBody": [
          {
            "group": "RequestBody",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>the name of this senseBox.</p>"
          },
          {
            "group": "RequestBody",
            "type": "String",
            "optional": true,
            "field": "grouptag",
            "description": "<p>the grouptag of this senseBox.</p>"
          },
          {
            "group": "RequestBody",
            "type": "String",
            "allowedValues": [
              "\"indoor\"",
              "\"outdoor\"",
              "\"mobile\"",
              "\"unknown\""
            ],
            "optional": false,
            "field": "exposure",
            "description": "<p>the exposure of this senseBox.</p>"
          },
          {
            "group": "RequestBody",
            "type": "Location",
            "optional": false,
            "field": "location",
            "description": "<p>the coordinates of this senseBox.</p>"
          },
          {
            "group": "RequestBody",
            "type": "String",
            "allowedValues": [
              "\"homeV2Lora\"",
              "\"homeV2Ethernet\"",
              "\"homeV2Wifi\"",
              "\"homeEthernet\"",
              "\"homeWifi\"",
              "\"homeEthernetFeinstaub\"",
              "\"homeWifiFeinstaub\"",
              "\"luftdaten_sds011\"",
              "\"luftdaten_sds011_dht11\"",
              "\"luftdaten_sds011_dht22\"",
              "\"luftdaten_sds011_bmp180\"",
              "\"luftdaten_sds011_bme280\"",
              "\"hackair_home_v2\""
            ],
            "optional": true,
            "field": "model",
            "description": "<p>specify the model if you want to use a predefined senseBox model, autocreating sensor definitions.</p>"
          },
          {
            "group": "RequestBody",
            "type": "Sensor[]",
            "optional": true,
            "field": "sensors",
            "description": "<p>an array containing the sensors of this senseBox. Only use if <code>model</code> is unspecified.</p>"
          },
          {
            "group": "RequestBody",
            "type": "String",
            "allowedValues": [
              "\"hdc1080\"",
              "\"bmp280\"",
              "\"tsl45315\"",
              "\"veml6070\"",
              "\"sds011\"",
              "\"bme680\"",
              "\"smt50\"",
              "\"soundlevelmeter\""
            ],
            "optional": true,
            "field": "sensorTemplates",
            "description": "<p>Specify which sensors should be included.</p>"
          },
          {
            "group": "RequestBody",
            "type": "Object",
            "optional": true,
            "field": "mqtt",
            "description": "<p>specify parameters of the MQTT integration for external measurement upload. Please see below for the accepted parameters</p>"
          },
          {
            "group": "RequestBody",
            "type": "Object",
            "optional": true,
            "field": "ttn",
            "description": "<p>specify parameters for the TTN integration for measurement from TheThingsNetwork.org upload. Please see below for the accepted parameters</p>"
          }
        ],
        "Formats accepted for the location field": [
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": false,
            "field": "lat",
            "description": "<p>Latitude between -90 and 90</p>"
          },
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": false,
            "field": "lng",
            "description": "<p>Longitude between -180 and 180</p>"
          },
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": true,
            "field": "height",
            "description": "<p>Height above ground in meters.</p>"
          }
        ],
        "A single sensor for the nested Sensor parameter": [
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "title",
            "description": "<p>the title of the phenomenon the sensor observes.</p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "unit",
            "description": "<p>the unit of the phenomenon the sensor observes.</p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "sensorType",
            "description": "<p>the type of the sensor.</p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": true,
            "field": "icon",
            "description": "<p>the visual representation for the openSenseMap of this sensor.</p>"
          }
        ],
        "Settings for a senseBox connected through MQTT": [
          {
            "group": "MqttOption",
            "type": "Boolean",
            "optional": false,
            "field": "enabled",
            "defaultValue": "false",
            "description": "<p>enable or disable mqtt</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "optional": false,
            "field": "url",
            "description": "<p>the url to the mqtt server.</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "optional": false,
            "field": "topic",
            "description": "<p>the topic to subscribe to.</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "allowedValues": [
              "\"json\"",
              "\"csv\""
            ],
            "optional": false,
            "field": "messageFormat",
            "description": "<p>the format the mqtt messages are in.</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "optional": false,
            "field": "decodeOptions",
            "description": "<p>a json encoded string with options for decoding the message. 'jsonPath' for 'json' messageFormat.</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "optional": false,
            "field": "connectionOptions",
            "description": "<p>a json encoded string with options to supply to the mqtt client (https://github.com/mqttjs/MQTT.js#client)</p>"
          }
        ],
        "Settings for a senseBox connected through thethingsnetwork.org (TTN)": [
          {
            "group": "TTNOption",
            "type": "String",
            "optional": false,
            "field": "dev_id",
            "description": "<p>The device ID recieved from TTN</p>"
          },
          {
            "group": "TTNOption",
            "type": "String",
            "optional": false,
            "field": "app_id",
            "description": "<p>The application ID recieved from TTN</p>"
          },
          {
            "group": "TTNOption",
            "type": "String",
            "allowedValues": [
              "\"lora-serialization\"",
              "\"sensebox/home\"",
              "\"json\"",
              "\"debug\""
            ],
            "optional": false,
            "field": "profile",
            "description": "<p>A decoding profile matching the payload format. For details and configuration see https://github.com/sensebox/ttn-osem-integration#decoding-profiles</p>"
          },
          {
            "group": "TTNOption",
            "type": "Array",
            "optional": true,
            "field": "decodeOptions",
            "description": "<p>A JSON Array containing decoder configuration, needed for some profiles.</p>"
          },
          {
            "group": "TTNOption",
            "type": "Number",
            "optional": true,
            "field": "port",
            "description": "<p>The TTN port to listen for messages. Optional, if not provided, all ports are used.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Location Object:",
          "content": "{ \"lat\": 51.972, \"lng\": 7.684, \"height\": 66.6 }",
          "type": "application/json"
        },
        {
          "title": "Location Array:",
          "content": "[7.684, 51.972, 66.6]",
          "type": "application/json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/boxesController.js",
    "groupTitle": "Boxes",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "allowedValues": [
              "\"application/json\"",
              "\"application/json; charset=utf-8\""
            ],
            "optional": false,
            "field": "content-type",
            "description": ""
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
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
            "field": "415",
            "description": "<p>the request has invalid or missing content type.</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 415 Unsupported Media Type\n{\"code\":\"NotAuthorized\",\"message\":\"Unsupported content-type. Try application/json\"}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "put",
    "url": "/boxes/:senseBoxId",
    "title": "Update a senseBox",
    "description": "<p>Modify the properties of a senseBox. Almost every aspect of a senseBox can be modified through this endpoint.</p> <h3>Creating, updating or deleting sensors:</h3> <p>Your request should contain a <code>sensors</code> array with at least one <code>sensor</code> object. You'll need to specify at least one of these properties:</p> <ul> <li><code>sensor</code> object has <code>&quot;edited&quot;</code> key present: Tell the API to replace all keys of the sensor with the specified <code>_id</code> with the supllied keys. (Specify all properties! <code>{ _id, title, unit, sensorType, icon }</code>)</li> <li><code>sensor</code> object has <code>&quot;edited&quot;</code> and <code>&quot;new&quot;</code> keys: Tell the API this sensor is new and should be added to the senseBox. (Specify all properties! <code>{ title, unit, sensorType }</code>)</li> <li><code>sensor</code> object has <code>&quot;deleted&quot;</code> key: Tell the API to delete this sensor from the senseBox. <strong>Also deletes all measurements of this sensor!!</strong> Needs the <code>_id</code> property.</li> </ul> <p><code>sensor</code> objects without <code>edited</code>, <code>new</code>, or <code>deleted</code> keys will be ignored!</p>",
    "parameter": {
      "fields": {
        "RequestBody": [
          {
            "group": "RequestBody",
            "type": "String",
            "optional": true,
            "field": "name",
            "description": "<p>the name of this senseBox.</p>"
          },
          {
            "group": "RequestBody",
            "type": "String",
            "optional": true,
            "field": "grouptag",
            "description": "<p>the grouptag of this senseBox. Send '' (empty string) to delete this property.</p>"
          },
          {
            "group": "RequestBody",
            "type": "Location",
            "optional": true,
            "field": "location",
            "description": "<p>the new coordinates of this senseBox. Measurements will keep the reference to their correct location</p>"
          },
          {
            "group": "RequestBody",
            "type": "Sensor[]",
            "optional": true,
            "field": "sensors",
            "description": "<p>an array containing the sensors of this senseBox. Only use if model is unspecified</p>"
          },
          {
            "group": "RequestBody",
            "type": "MqttOption",
            "optional": true,
            "field": "mqtt",
            "description": "<p>settings for the MQTT integration of this senseBox</p>"
          },
          {
            "group": "RequestBody",
            "type": "TTNOption",
            "optional": true,
            "field": "ttn",
            "description": "<p>settings for the TTN integration of this senseBox</p>"
          },
          {
            "group": "RequestBody",
            "type": "String",
            "optional": true,
            "field": "description",
            "description": "<p>the updated description of this senseBox. Send '' (empty string) to delete this property.</p>"
          },
          {
            "group": "RequestBody",
            "type": "String",
            "optional": true,
            "field": "image",
            "description": "<p>the updated image of this senseBox encoded as base64 data uri. To delete the current image, send 'deleteImage: true'.</p>"
          },
          {
            "group": "RequestBody",
            "type": "Object",
            "optional": true,
            "field": "addons",
            "description": "<p>allows to add addons to the box. Submit as Object with key <code>add</code> and the desired addon as value like <code>{&quot;add&quot;:&quot;feinstaub&quot;}</code></p>"
          }
        ],
        "A single sensor for the nested Sensor parameter": [
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "edited",
            "description": "<p><em>Value is ignored. Presence alone is enough</em> Tell the API to consider this sensor for changing or deleting. Specify all properties, even if not changed!</p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "new",
            "description": "<p><em>Value is ignored. Presence alone is enough</em> Tell the API to add this new sensor to the senseBox.</p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "deleted",
            "description": "<p><em>Value is ignored. Presence alone is enough</em> Tell the API to delete this sensor from the senseBox. <em>Warning: This will also delete all measurements of this sensor</em></p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "title",
            "description": "<p>the title of the phenomenon the sensor observes.</p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "unit",
            "description": "<p>the unit of the phenomenon the sensor observes.</p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": false,
            "field": "sensorType",
            "description": "<p>the type of the sensor.</p>"
          },
          {
            "group": "Sensor",
            "type": "String",
            "optional": true,
            "field": "icon",
            "description": "<p>the visual representation for the openSenseMap of this sensor.</p>"
          }
        ],
        "Formats accepted for the location field": [
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": false,
            "field": "lat",
            "description": "<p>Latitude between -90 and 90</p>"
          },
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": false,
            "field": "lng",
            "description": "<p>Longitude between -180 and 180</p>"
          },
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": true,
            "field": "height",
            "description": "<p>Height above ground in meters.</p>"
          }
        ],
        "Settings for a senseBox connected through MQTT": [
          {
            "group": "MqttOption",
            "type": "Boolean",
            "optional": false,
            "field": "enabled",
            "defaultValue": "false",
            "description": "<p>enable or disable mqtt</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "optional": false,
            "field": "url",
            "description": "<p>the url to the mqtt server.</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "optional": false,
            "field": "topic",
            "description": "<p>the topic to subscribe to.</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "allowedValues": [
              "\"json\"",
              "\"csv\""
            ],
            "optional": false,
            "field": "messageFormat",
            "description": "<p>the format the mqtt messages are in.</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "optional": false,
            "field": "decodeOptions",
            "description": "<p>a json encoded string with options for decoding the message. 'jsonPath' for 'json' messageFormat.</p>"
          },
          {
            "group": "MqttOption",
            "type": "String",
            "optional": false,
            "field": "connectionOptions",
            "description": "<p>a json encoded string with options to supply to the mqtt client (https://github.com/mqttjs/MQTT.js#client)</p>"
          }
        ],
        "Settings for a senseBox connected through thethingsnetwork.org (TTN)": [
          {
            "group": "TTNOption",
            "type": "String",
            "optional": false,
            "field": "dev_id",
            "description": "<p>The device ID recieved from TTN</p>"
          },
          {
            "group": "TTNOption",
            "type": "String",
            "optional": false,
            "field": "app_id",
            "description": "<p>The application ID recieved from TTN</p>"
          },
          {
            "group": "TTNOption",
            "type": "String",
            "allowedValues": [
              "\"lora-serialization\"",
              "\"sensebox/home\"",
              "\"json\"",
              "\"debug\""
            ],
            "optional": false,
            "field": "profile",
            "description": "<p>A decoding profile matching the payload format. For details and configuration see https://github.com/sensebox/ttn-osem-integration#decoding-profiles</p>"
          },
          {
            "group": "TTNOption",
            "type": "Array",
            "optional": true,
            "field": "decodeOptions",
            "description": "<p>A JSON Array containing decoder configuration, needed for some profiles.</p>"
          },
          {
            "group": "TTNOption",
            "type": "Number",
            "optional": true,
            "field": "port",
            "description": "<p>The TTN port to listen for messages. Optional, if not provided, all ports are used.</p>"
          }
        ],
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n \"_id\": \"56e741ff933e450c0fe2f705\",\n \"name\": \"my senseBox\",\n \"description\": \"this is just a description\",\n \"weblink\": \"https://opensensemap.org/explore/561ce8acb3de1fe005d3d7bf\",\n \"grouptag\": \"senseBoxes99\",\n \"exposure\": \"indoor\",\n \"sensors\": [\n   {\n     \"_id\": \"56e741ff933e450c0fe2f707\",\n     \"title\": \"UV-Intensität\",\n     \"unit\": \"μW/cm²\",\n     \"sensorType\": \"VEML6070\",\n     \"icon\": \"osem-sprinkles\",\n     \"edited\": \"true\"\n   }\n ],\n \"location\": {\n   \"lng\": 8.6956,\n   \"lat\": 50.0430\n },\n \"image\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAIVBMVEUAAABKrkMGteh0wW5Ixu931vKy3bO46fj/7hr/+J36/vyFw5EiAAAAAXRSTlMAQObYZgAAAF5JREFUeAFdjdECgzAIA1kIUvP/HzyhdrPe210L2GLYzhjj7VvRefmpn1MKFbdHUOzA9qRQEhIw3xMzEVeJDqkOrC9IJqWE7hFDLZ0Q6+zh7odsoU/j9qeDPXDf/cEX1xsDKIqAkK8AAAAASUVORK5CYII=\",\n \"mqtt\": {\n   \"url\": \"some url\",\n   \"topic\": \"some topic\",\n   \"messageFormat\": \"json\",\n   \"decodeOptions\": \"{\\\"jsonPath\\\":\\\"$.bla\\\"}\"\n }\n \"ttn\": {\n   \"app_id\": \"my-app-id-from-ttn\",\n   \"dev_id\": \"my-dev-id-from-ttn\",\n   \"profile\": \"sensebox/home\",\n   \"decodeOptions\": \"{\\\"jsonPath\\\":\\\"$.bla\\\"}\"\n },\n \"addons\": { \"add\": \"feinstaub\" }\n}",
          "type": "json"
        },
        {
          "title": "Location Object:",
          "content": "{ \"lat\": 51.972, \"lng\": 7.684, \"height\": 66.6 }",
          "type": "application/json"
        },
        {
          "title": "Location Array:",
          "content": "[7.684, 51.972, 66.6]",
          "type": "application/json"
        }
      ]
    },
    "group": "Boxes",
    "name": "updateBox",
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/boxesController.js",
    "groupTitle": "Boxes",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "allowedValues": [
              "\"application/json\"",
              "\"application/json; charset=utf-8\""
            ],
            "optional": false,
            "field": "content-type",
            "description": ""
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          },
          {
            "group": "Error 4xx",
            "type": "Object",
            "optional": false,
            "field": "415",
            "description": "<p>the request has invalid or missing content type.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 415 Unsupported Media Type\n{\"code\":\"NotAuthorized\",\"message\":\"Unsupported content-type. Try application/json\"}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/statistics/idw?bbox=7.6,51.2,7.8,51.4&phenomenon=Temperatur",
    "title": "Get a Inverse Distance Weighting Interpolation as FeatureCollection",
    "description": "<p>Retrieve a JSON object containing</p> <ul> <li><code>breaks</code>: an array containing equal distance breaks. Use <code>numClasses</code> parameter to control how many breaks to return.</li> <li><code>featureCollection</code>: a GeoJSON FeatureCollection with a computed Inverse Distance Interpolation for a certain region of interest and phenomenon.</li> <li><code>timesteps</code>: an array of RFC 3339 formatted timesteps. Use <code>numTimeSteps</code> parameter to control how many timesteps between <code>from-date</code> and <code>to-date</code> should be returned.</li> </ul> <p>The properties of each feature in the featureCollection is an object with RFC 3339 timestamps which are the timeSteps. The number of the timesteps can be controlled using the <code>numTimeSteps</code> parameter. Values falling inside each timestep are first averaged. Please be aware that requests with (areaSquareKilometers / cellWidth) &gt; 2500 will be rejected.</p>",
    "group": "Interpolation",
    "name": "calculateIdw",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phenomenon",
            "description": "<p>the name of the phenomenon you want to download the data for.</p>"
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "from-date",
            "description": "<p>Beginning date of measurement data (default: 2 days ago from now)</p>"
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "to-date",
            "description": "<p>End date of measurement data (default: now)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "hex",
              "square",
              "triangle"
            ],
            "optional": true,
            "field": "gridType",
            "defaultValue": "hex",
            "description": "<p>The type of the grid for IDW calculation</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": true,
            "field": "cellWidth",
            "defaultValue": "50",
            "description": "<p>The width of the grid cells in kilometers. Must be positive</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "allowedValues": [
              "1-9"
            ],
            "optional": true,
            "field": "power",
            "defaultValue": "1",
            "description": "<p>The power of the IDW calculation</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "allowedValues": [
              "1-10"
            ],
            "optional": true,
            "field": "numTimeSteps",
            "defaultValue": "6",
            "description": "<p>Return this many timesteps between <code>from-date</code> and <code>to-date</code></p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": true,
            "field": "numClasses",
            "defaultValue": "6",
            "description": "<p>Number of classes in the breaks array. Must be positive</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "bbox",
            "description": "<p>A bounding box containing 4 WGS84 coordinates separated by comata (,). Order is: longitude southwest, latitude southwest, longitude northeast, latitude northeast. Minimal and maximal values are: -180, 180 for longitude and -90, 90 for latitude.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"indoor\"",
              "\"outdoor\"",
              "\"mobile\"",
              "\"unknown\""
            ],
            "optional": true,
            "field": "exposure",
            "description": "<p>only include boxes with this exposure. Allows to specify multiple exposures separated by comma (Example: <code>indoor,mobile</code>)</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/statisticsController.js",
    "groupTitle": "Interpolation"
  },
  {
    "type": "delete",
    "url": "/boxes/:senseBoxId/:sensorId/measurements",
    "title": "Delete measurements of a sensor",
    "description": "<p>This method allows to delete measurements for the specified sensor. Use the request body to specify which measurements should be deleted.</p>",
    "name": "deleteMeasurements",
    "group": "Measurements",
    "parameter": {
      "fields": {
        "RequestBody": [
          {
            "group": "RequestBody",
            "type": "RFC3339Date",
            "optional": true,
            "field": "from-date",
            "description": "<p>Beginning date of measurement data (no default)</p>"
          },
          {
            "group": "RequestBody",
            "type": "RFC3339Date",
            "optional": true,
            "field": "to-date",
            "description": "<p>End date of measurement data (no default)</p>"
          },
          {
            "group": "RequestBody",
            "type": "RFC3339Date[]",
            "optional": true,
            "field": "timestamps",
            "description": "<p>Allows to specify timestamps which should be deleted</p>"
          },
          {
            "group": "RequestBody",
            "type": "Boolean",
            "allowedValues": [
              "true",
              "false"
            ],
            "optional": true,
            "field": "deleteAllMeasurements",
            "defaultValue": "false",
            "description": "<p>Specify <code>deleteAllMeasurements</code> with a value of <code>true</code> to delete all measurements of this sensor</p>"
          }
        ],
        "Parameter": [
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
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/sensorsController.js",
    "groupTitle": "Measurements",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "allowedValues": [
              "\"application/json\"",
              "\"application/json; charset=utf-8\""
            ],
            "optional": false,
            "field": "content-type",
            "description": ""
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          },
          {
            "group": "Error 4xx",
            "type": "Object",
            "optional": false,
            "field": "415",
            "description": "<p>the request has invalid or missing content type.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 415 Unsupported Media Type\n{\"code\":\"NotAuthorized\",\"message\":\"Unsupported content-type. Try application/json\"}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/boxes/:senseBoxId/data/:sensorId?from-date=fromDate&to-date=toDate&download=true&format=json",
    "title": "Get the 10000 latest measurements for a sensor",
    "description": "<p>Get up to 10000 measurements from a sensor for a specific time frame, parameters <code>from-date</code> and <code>to-date</code> are optional. If not set, the last 48 hours are used. The maximum time frame is 1 month. If <code>download=true</code> <code>Content-disposition</code> headers will be set. Allows for JSON or CSV format.</p>",
    "group": "Measurements",
    "name": "getData",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "from-date",
            "description": "<p>Beginning date of measurement data (default: 48 hours ago from now)</p>"
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "to-date",
            "description": "<p>End date of measurement data (default: now)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"json\"",
              "\"csv\""
            ],
            "optional": true,
            "field": "format",
            "defaultValue": "json",
            "description": "<p>Can be 'json' (default) or 'csv' (default: json)</p>"
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "allowedValues": [
              "\"true\"",
              "\"false\""
            ],
            "optional": true,
            "field": "download",
            "description": "<p>if specified, the api will set the <code>content-disposition</code> header thus forcing browsers to download instead of displaying. Is always true for format csv.</p>"
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
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"replace\"",
              "\"mark\""
            ],
            "optional": true,
            "field": "outliers",
            "description": "<p>Specifying this parameter enables outlier calculation which adds a new field called <code>isOutlier</code> to the data. Possible values are &quot;mark&quot; and &quot;replace&quot;.</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "allowedValues": [
              "1-50"
            ],
            "optional": true,
            "field": "outlier-window",
            "defaultValue": "15",
            "description": "<p>Size of moving window used as base to calculate the outliers.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "comma",
              "semicolon"
            ],
            "optional": true,
            "field": "delimiter",
            "defaultValue": "comma",
            "description": "<p>Only for csv: the delimiter for csv. Possible values: <code>semicolon</code>, <code>comma</code>. Per default a comma is used. Alternatively you can use separator as parameter name.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/measurementsController.js",
    "groupTitle": "Measurements"
  },
  {
    "type": "get,post",
    "url": "/boxes/data?boxId=:senseBoxIds&from-date=:fromDate&to-date:toDate&phenomenon=:phenomenon",
    "title": "Get latest measurements for a phenomenon as CSV",
    "description": "<p>Download data of a given phenomenon from multiple selected senseBoxes as CSV</p>",
    "group": "Measurements",
    "name": "getDataMulti",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "boxId",
            "description": "<p>Comma separated list of senseBox IDs.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phenomenon",
            "description": "<p>the name of the phenomenon you want to download the data for.</p>"
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "from-date",
            "description": "<p>Beginning date of measurement data (default: 2 days ago from now)</p>"
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": true,
            "field": "to-date",
            "description": "<p>End date of measurement data (default: now)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"csv\"",
              "\"json\""
            ],
            "optional": true,
            "field": "format",
            "defaultValue": "csv",
            "description": "<p>Can be 'csv' (default) or 'json' (default: csv)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "createdAt",
              "value",
              "lat",
              "lon",
              "height",
              "boxId",
              "boxName",
              "exposure",
              "sensorId",
              "phenomenon",
              "unit",
              "sensorType"
            ],
            "optional": true,
            "field": "columns",
            "defaultValue": "sensorId,createdAt,value,lat,lon",
            "description": "<p>Comma separated list of columns to export.</p>"
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "allowedValues": [
              "true",
              "false"
            ],
            "optional": true,
            "field": "download",
            "defaultValue": "true",
            "description": "<p>Set the <code>content-disposition</code> header to force browsers to download instead of displaying.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "comma",
              "semicolon"
            ],
            "optional": true,
            "field": "delimiter",
            "defaultValue": "comma",
            "description": "<p>Only for csv: the delimiter for csv. Possible values: <code>semicolon</code>, <code>comma</code>. Per default a comma is used. Alternatively you can use separator as parameter name.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "bbox",
            "description": "<p>A bounding box containing 4 WGS84 coordinates separated by comata (,). Order is: longitude southwest, latitude southwest, longitude northeast, latitude northeast. Minimal and maximal values are: -180, 180 for longitude and -90, 90 for latitude.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"indoor\"",
              "\"outdoor\"",
              "\"mobile\"",
              "\"unknown\""
            ],
            "optional": true,
            "field": "exposure",
            "description": "<p>only include boxes with this exposure. Allows to specify multiple exposures separated by comma (Example: <code>indoor,mobile</code>)</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/measurementsController.js",
    "groupTitle": "Measurements"
  },
  {
    "type": "get",
    "url": "/boxes/:senseBoxId/sensors",
    "title": "Get latest measurements of a senseBox",
    "description": "<p>Get the latest measurements of all sensors of the specified senseBox.</p>",
    "group": "Measurements",
    "name": "getLatestMeasurements",
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/measurementsController.js",
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
    "url": "/boxes/:senseBoxId/:sensorId",
    "title": "Post new measurement",
    "description": "<p>Posts a new measurement to a specific sensor of a box.</p>",
    "group": "Measurements",
    "name": "postNewMeasurement",
    "parameter": {
      "fields": {
        "RequestBody": [
          {
            "group": "RequestBody",
            "type": "String",
            "optional": false,
            "field": "value",
            "description": "<p>the measured value of the sensor. Also accepts JSON float numbers.</p>"
          },
          {
            "group": "RequestBody",
            "type": "RFC3339Date",
            "optional": true,
            "field": "createdAt",
            "description": "<p>the timestamp of the measurement. Should conform to RFC 3339. Is needed when posting with Location Values!</p>"
          },
          {
            "group": "RequestBody",
            "type": "Location",
            "optional": true,
            "field": "location",
            "description": "<p>the WGS84-coordinates of the measurement.</p>"
          }
        ],
        "Parameter": [
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
        ],
        "Formats accepted for the location field": [
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": false,
            "field": "lat",
            "description": "<p>Latitude between -90 and 90</p>"
          },
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": false,
            "field": "lng",
            "description": "<p>Longitude between -180 and 180</p>"
          },
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": true,
            "field": "height",
            "description": "<p>Height above ground in meters.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Location Object:",
          "content": "{ \"lat\": 51.972, \"lng\": 7.684, \"height\": 66.6 }",
          "type": "application/json"
        },
        {
          "title": "Location Array:",
          "content": "[7.684, 51.972, 66.6]",
          "type": "application/json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/measurementsController.js",
    "groupTitle": "Measurements",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "allowedValues": [
              "\"application/json\"",
              "\"application/json; charset=utf-8\""
            ],
            "optional": false,
            "field": "content-type",
            "description": ""
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "Object",
            "optional": false,
            "field": "415",
            "description": "<p>the request has invalid or missing content type.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 415 Unsupported Media Type\n{\"code\":\"NotAuthorized\",\"message\":\"Unsupported content-type. Try application/json\"}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/boxes/:senseBoxId/data",
    "title": "Post multiple new measurements",
    "description": "<p>Post multiple new measurements in multiple formats to a box. Allows the use of csv, json array and json object notation.</p> <p><strong>CSV:</strong><br/> For data in csv format, first use <code>content-type: text/csv</code> as header, then submit multiple values as lines in <code>sensorId,value,[createdAt]</code> form. Timestamp is optional. Do not submit a header.</p> <p><strong>JSON Array:</strong><br/> You can submit your data as array. Your measurements should be objects with the keys <code>sensor</code>, <code>value</code> and optionally <code>createdAt</code> and <code>location</code>. Specify the header <code>content-type: application/json</code>. If Location Values are posted, the Timestamp becomes obligatory.</p> <p><strong>JSON Object:</strong><br/> The third form is to encode your measurements in an object. Here, the keys of the object are the sensorIds, the values of the object are either just the <code>value</code> of your measurement or an array of the form <code>[value, createdAt, location]</code>, where the latter two values are optional.</p> <p><strong>Luftdaten Format</strong><br/> Decoding of luftdaten.info json format. Activate by specifying <code>luftdaten=true</code> in the query string. The API now tries to convert the objects in the <code>sensordatavalues</code> key to the openSenseMap JSON Array format. Sensors are matched by the key <code>value_type</code> against the <code>title</code> of the sensors of this box. <code>SDS_P1</code> matches sensors with title <code>PM10</code>, <code>SDS_P2</code> matches sensors with title <code>PM2.5</code>. You can find all matchings in the source code of the openSenseMap-API (<code>lib/decoding/luftdatenHandler.js</code>)</p> <p><strong>hackAIR Format</strong><br/> Decoding of hackAIR json format. Activate by specifying <code>hackair=true</code> in the query string. The API now tries to convert the values in the <code>reading</code> key to the openSenseMap JSON Array format. Sensors are matched by the key <code>sensor_description</code> against the <code>title</code> of the sensors of this box. <code>PM2.5_AirPollutantValue</code> matches sensors with title <code>PM2.5</code>, <code>PM10_AirPollutantValue</code> matches sensors with title <code>PM10</code>. You can find all matchings in the source code of the openSenseMap-API (<code>lib/decoding/hackAirHandler.js</code>)</p> <p><strong>senseBox Bytes Format</strong><br/> Submit measurements as raw bytes. Set the &quot;content-type&quot; header to <code>application/sbx-bytes</code>. Send measurements as 12 byte sensor Id with most significant byte first followed by 4 byte float measurement in little endian (least significant byte first) notation. A valid measurement could look like this:<br />[ 0x59, 0x5f, 0x9a, 0x28, 0x2d, 0xcb, 0xee, 0x77, 0xac, 0x0e, 0x5d, 0xc4, 0x9a, 0x99, 0x89, 0x40 ] but encoded as raw bytes. Multiple measurements are just multiple tuples of id and value. The number of bytes should be a multiple of 16.</p> <p><strong>senseBox Bytes with Timestamp Format</strong><br/> Submit measurements with timestamp as raw bytes. Set the &quot;content-type&quot; header to <code>application/sbx-bytes-ts</code>. Send measurements as 12 byte sensor Id with most significant byte first followed by 4 byte float measurement in little endian (least significant byte first) notation followed by a 4 byte uint32_t unix timestamp in little endian (least significant byte first) notation. A valid measurement could look like this:<br />[ 0x59, 0x5f, 0x9a, 0x28, 0x2d, 0xcb, 0xee, 0x77, 0xac, 0x0e, 0x5d, 0xc4, 0x9a, 0x99, 0x89, 0x40, 0x34, 0x0c, 0x60, 0x59 ] but encoded as raw bytes. Multiple measurements are just multiple tuples of id, value and timestamp. The number of bytes should be a multiple of 20.</p> <p>For all encodings, the maximum count of values in one request is 2500.</p>",
    "group": "Measurements",
    "name": "postNewMeasurements",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "luftdaten",
            "description": "<p>Specify whatever you want (like <code>luftdaten=1</code>. Signals the api to treat the incoming data as luftdaten.info formatted json.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "hackair",
            "description": "<p>Specify whatever you want (like <code>hackair=1</code>. Signals the api to treat the incoming data as hackair formatted json.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "senseBoxId",
            "description": "<p>the ID of the senseBox you are referring to.</p>"
          }
        ],
        "Formats accepted for the location field": [
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": false,
            "field": "lat",
            "description": "<p>Latitude between -90 and 90</p>"
          },
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": false,
            "field": "lng",
            "description": "<p>Longitude between -180 and 180</p>"
          },
          {
            "group": "LocationOption",
            "type": "Number",
            "optional": true,
            "field": "height",
            "description": "<p>Height above ground in meters.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "JSON-Object:",
          "content": "{\n  \"sensorID\": \"value\",\n  \"anotherSensorID\": [\"value\"]\n  \"sensorID3\": [\"value\", \"createdAt as RFC 3339-timestamp\"],\n  \"sensorID4\": [\"value\", \"createdAt as RFC 3339-timestamp\", \"location latlng-object or array\"],\n}",
          "type": "application/json"
        },
        {
          "title": "JSON-Array:",
          "content": "[\n  {\"sensor\":\"sensorID\", \"value\":\"value\"},\n  {\"sensor\":\"anotherSensorId\", \"value\":\"value\", \"createdAt\": \"RFC 3339-timestamp\", \"location\": [lng,lat,height]}\n  ...\n]",
          "type": "application/json"
        },
        {
          "title": "CSV:",
          "content": "sensorID,value\nanotherSensorId,value,RFC 3339-timestamp\nsensorIDtheThird,value\nanotherSensorId,value,RFC 3339-timestamp,longitude,latitude\nanotherSensorId,value,RFC 3339-timestamp,longitude,latitude,height\n...",
          "type": "text/csv"
        },
        {
          "title": "Luftdaten Format:",
          "content": "{\n  \"sensordatavalues\": [\n    {\n      \"value_type\": \"SDS_P1\",\n      \"value\": \"5.38\"\n    },\n    {\n      \"value_type\": \"SDS_P2\",\n      \"value\": \"4.98\"\n    }\n  ]\n}",
          "type": "application/json"
        },
        {
          "title": "hackAIR Format:",
          "content": "{\n  \"reading\": {\n    \"PM2.5_AirPollutantValue\": \"7.93\",\n    \"PM10_AirPollutantValue\": \"32.63\"\n   },\n   \"battery\": \"5.99\",\n   \"tamper\": \"0\",\n   \"error\": \"4\"\n}",
          "type": "application/json"
        },
        {
          "title": "Location Object:",
          "content": "{ \"lat\": 51.972, \"lng\": 7.684, \"height\": 66.6 }",
          "type": "application/json"
        },
        {
          "title": "Location Array:",
          "content": "[7.684, 51.972, 66.6]",
          "type": "application/json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/measurementsController.js",
    "groupTitle": "Measurements"
  },
  {
    "type": "get",
    "url": "/stats",
    "title": "Get some statistics about the database",
    "description": "<p>returns an array with three numbers which denominates the count of senseBoxes, the count of measurements and the count of measurements in the last minute.</p>",
    "name": "getStatistics",
    "group": "Misc",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Boolean",
            "allowedValues": [
              "true",
              "false"
            ],
            "optional": true,
            "field": "human",
            "defaultValue": "false",
            "description": "<p>if true, make numbers easier human readable.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "[human=false]",
          "content": "[318,118241889,393]",
          "type": "json"
        },
        {
          "title": "[human=true]",
          "content": "[\"318\",\"118M\",\"393\"]",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/statisticsController.js",
    "groupTitle": "Misc"
  },
  {
    "type": "get",
    "url": "/",
    "title": "print all routes",
    "name": "printRoutes",
    "description": "<p>Returns all routes of this API in human readable format</p>",
    "group": "Misc",
    "version": "0.0.0",
    "filename": "./packages/api/lib/routes.js",
    "groupTitle": "Misc"
  },
  {
    "type": "get",
    "url": "/statistics/descriptive",
    "title": "Compute basic descriptive statistics over specified time windows",
    "description": "<p>Allows to compute basic descriptive statistical methods over multiple sensors and multiple time windows. The supported methods are: arithmetic mean, geometric mean, harmonic mean, maximum, median ,minimum, mode, root mean square, standard deviation, sum of values and variance. Parameters <code>from-date</code> and <code>to-date</code> are modified to fit you specified <code>window</code> parameter. You should either specifiy multiple station ids using the <code>boxId</code> parameter or a bounding box with the <code>bbox</code> parameter, but not both.</p> <p>By default, stations with exposure <code>mobile</code> are excluded.</p>",
    "group": "Statistics",
    "name": "descriptive",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "boxId",
            "description": "<p>Comma separated list of senseBox IDs.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phenomenon",
            "description": "<p>the name of the phenomenon you want to download the data for.</p>"
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": false,
            "field": "from-date",
            "description": "<p>Beginning date of measurement data</p>"
          },
          {
            "group": "Parameter",
            "type": "RFC3339Date",
            "optional": false,
            "field": "to-date",
            "description": "<p>End date of measurement data</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "arithmeticMean",
              "geometricMean",
              "harmonicMean",
              "max",
              "median",
              "min",
              "mode",
              "rootMeanSquare",
              "standardDeviation",
              "sum",
              "variance"
            ],
            "optional": false,
            "field": "operation",
            "description": "<p>Statistical operation to execute</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "window",
            "description": "<p>Time window to apply. Either a number in Milliseconds or a <a href=\"https://npmjs.com/ms\"><code>zeit/ms</code></a>-parseable string rounded to the nearest minute (Math.round(<window-in-milliseconds>) / 60000). At least 1 minute</p>"
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "allowedValues": [
              "true",
              "false"
            ],
            "optional": true,
            "field": "download",
            "defaultValue": "true",
            "description": "<p>Set the <code>content-disposition</code> header to force browsers to download instead of displaying.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "boxId",
              "boxName",
              "exposure",
              "height",
              "lat",
              "lon",
              "phenomenon",
              "sensorType",
              "unit"
            ],
            "optional": true,
            "field": "columns",
            "description": "<p>Comma separated list of additional columns to export.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "csv",
              "json",
              "tidy"
            ],
            "optional": true,
            "field": "format",
            "defaultValue": "csv",
            "description": "<p>Controls the format of the responde. Default is <code>csv</code>. Specifying <code>json</code> returns a JSON array element for each sensor with RFC3339 timestamps key value pairs for the requested statistical operation. Specifying <code>tidy</code> returns a csv with rows for each window and sensor.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "bbox",
            "description": "<p>A bounding box containing 4 WGS84 coordinates separated by comata (,). Order is: longitude southwest, latitude southwest, longitude northeast, latitude northeast. Minimal and maximal values are: -180, 180 for longitude and -90, 90 for latitude.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"indoor\"",
              "\"outdoor\"",
              "\"mobile\"",
              "\"unknown\""
            ],
            "optional": true,
            "field": "exposure",
            "description": "<p>only include boxes with this exposure. Allows to specify multiple exposures separated by comma (Example: <code>indoor,mobile</code>)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "comma",
              "semicolon"
            ],
            "optional": true,
            "field": "delimiter",
            "defaultValue": "comma",
            "description": "<p>Only for csv: the delimiter for csv. Possible values: <code>semicolon</code>, <code>comma</code>. Per default a comma is used. Alternatively you can use separator as parameter name.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Example CSV:",
          "content": "sensorId,Temperatur_2018-01-31,Temperatur_2018-02-01Z,Temperatur_2018-02-02Z,Temperatur_2018-02-03Z,Temperatur_2018-02-04Z,Temperatur_2018-02-05Z,Temperatur_2018-02-06Z,Temperatur_2018-02-07Z\n5a787e38d55e821b639e890f,,,138,104,56,17,,\n5a787e38d55e821b639e8915,,,138,104,56,17,,",
          "type": "text/csv"
        },
        {
          "title": "Example JSON:",
          "content": "sensorId,Temperatur_2018-01-31,Temperatur_2018-02-01Z,Temperatur_2018-02-02Z,Temperatur_2018-02-03Z,Temperatur_2018-02-04Z,Temperatur_2018-02-05Z,Temperatur_2018-02-06Z,Temperatur_2018-02-07Z\n[\n  {\n    \"sensorId\": \"5a787e38d55e821b639e890f\",\n    \"2018-02-02T00:00:00.000Z\": 138,\n    \"2018-02-03T00:00:00.000Z\": 104,\n    \"2018-02-04T00:00:00.000Z\": 56,\n    \"2018-02-05T00:00:00.000Z\": 17\n  },\n  {\n    \"sensorId\": \"5a787e38d55e821b639e8915\",\n    \"2018-02-02T00:00:00.000Z\": 138,\n    \"2018-02-03T00:00:00.000Z\": 104,\n    \"2018-02-04T00:00:00.000Z\": 56,\n    \"2018-02-05T00:00:00.000Z\": 17\n  }\n]",
          "type": "application/json"
        },
        {
          "title": "Example tidy CSV:",
          "content": "sensorId,time_start,arithmeticMean_1d\n5a8e8c6c8432c3001bfe414a,2018-02-02T00:00:00.000Z,138\n5a8e8c6c8432c3001bfe414a,2018-02-03T00:00:00.000Z,104\n5a8e8c6c8432c3001bfe414a,2018-02-04T00:00:00.000Z,56\n5a8e8c6c8432c3001bfe414a,2018-02-05T00:00:00.000Z,17\n5a8e8c6c8432c3001bfe4150,2018-02-02T00:00:00.000Z,138\n5a8e8c6c8432c3001bfe4150,2018-02-03T00:00:00.000Z,104\n5a8e8c6c8432c3001bfe4150,2018-02-04T00:00:00.000Z,56\n5a8e8c6c8432c3001bfe4150,2018-02-05T00:00:00.000Z,17\n5a8e8c6c8432c3001bfe4156,2018-02-02T00:00:00.000Z,138\n5a8e8c6c8432c3001bfe4156,2018-02-03T00:00:00.000Z,104\n5a8e8c6c8432c3001bfe4156,2018-02-04T00:00:00.000Z,56\n5a8e8c6c8432c3001bfe4156,2018-02-05T00:00:00.000Z,17",
          "type": "text/csv"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/statisticsController.js",
    "groupTitle": "Statistics"
  },
  {
    "type": "post",
    "url": "/users/confirm-email",
    "title": "confirm email address",
    "name": "confirm_email",
    "description": "<p>confirm email address to the system</p>",
    "group": "Users",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>the email of the user to confirm</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>the email confirmation token which was sent via email to the user</p>"
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
            "field": "code",
            "description": "<p><code>Ok</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p><code>E-Mail successfully confirmed. Thank you</code></p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users"
  },
  {
    "type": "delete",
    "url": "/users/me",
    "title": "Delete user, all of its boxes and all of its boxes measurements",
    "name": "deleteUser",
    "description": "<p>Allows to delete the currently logged in user using its password. All of the boxes and measurements of the user will be deleted as well.</p>",
    "group": "Users",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>the current password for this user.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/users/me",
    "title": "Get details",
    "name": "getUser",
    "description": "<p>Returns information about the currently signed in user</p>",
    "group": "Users",
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/users/me/boxes",
    "title": "list all boxes of the signed in user",
    "name": "getUserBoxes",
    "description": "<p>List all boxes of the signed in user with secret fields</p>",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "code",
            "description": "<p><code>Ok</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "data",
            "description": "<p>A json object with a single <code>boxes</code> array field</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users"
  },
  {
    "type": "post",
    "url": "/users/password-reset",
    "title": "reset password with passwordResetToken",
    "name": "password_reset",
    "description": "<p>reset password with token sent through email</p>",
    "group": "Users",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>new password. needs to be at least 8 characters</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>the password reset token which was sent via email to the user</p>"
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
            "field": "code",
            "description": "<p><code>Ok</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p><code>Password successfully changed. You can now login with your new password</code></p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users"
  },
  {
    "type": "post",
    "url": "/users/refresh-auth",
    "title": "Refresh Authorization",
    "name": "refresh_auth",
    "description": "<p>Allows to request a new JSON Web Token using the refresh token sent along with the JWT when signing in and registering</p>",
    "group": "Users",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>the refresh token</p>"
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
            "field": "code",
            "description": "<p><code>Authorized</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p><code>Successfully refreshed auth</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>valid json web token</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "refreshToken",
            "description": "<p>valid refresh token</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "data",
            "description": "<p><code>{ &quot;user&quot;: {&quot;name&quot;:&quot;fullname&quot;,&quot;email&quot;:&quot;test@test.de&quot;,&quot;role&quot;:&quot;user&quot;,&quot;language&quot;:&quot;en_US&quot;,&quot;boxes&quot;:[],&quot;emailIsConfirmed&quot;:false} }</code></p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "Object",
            "optional": false,
            "field": "Forbidden",
            "description": "<p><code>{&quot;code&quot;:&quot;ForbiddenError&quot;,&quot;message&quot;:&quot;Refresh token invalid or too old. Please sign in with your username and password.&quot;}</code></p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users"
  },
  {
    "type": "post",
    "url": "/users/register",
    "title": "Register new",
    "name": "register",
    "description": "<p>Register a new openSenseMap user</p>",
    "group": "Users",
    "success": {
      "fields": {
        "Created 201": [
          {
            "group": "Created 201",
            "type": "String",
            "optional": false,
            "field": "code",
            "description": "<p><code>Created</code></p>"
          },
          {
            "group": "Created 201",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p><code>Successfully registered new user</code></p>"
          },
          {
            "group": "Created 201",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>valid json web token</p>"
          },
          {
            "group": "Created 201",
            "type": "String",
            "optional": false,
            "field": "refreshToken",
            "description": "<p>valid refresh token</p>"
          },
          {
            "group": "Created 201",
            "type": "Object",
            "optional": false,
            "field": "data",
            "description": "<p><code>{ &quot;user&quot;: {&quot;name&quot;:&quot;fullname&quot;,&quot;email&quot;:&quot;test@test.de&quot;,&quot;role&quot;:&quot;user&quot;,&quot;language&quot;:&quot;en_US&quot;,&quot;boxes&quot;:[],&quot;emailIsConfirmed&quot;:false} }</code></p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users",
    "parameter": {
      "fields": {
        "Parameters for creating a new openSenseMap user": [
          {
            "group": "User",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>the full name or nickname of the user. The name must consist of at least 3 and up to 40 characters and only allows to use alphanumerics (a-zA-Z0-9), dots (.), dashes (-), underscores (_) and spaces. The first character must be a letter or number.</p>"
          },
          {
            "group": "User",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>the email for the user. Is used for signing in and for sending the arduino sketch.</p>"
          },
          {
            "group": "User",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>the desired password for the user. Must be at least 8 characters long.</p>"
          },
          {
            "group": "User",
            "type": "String",
            "optional": true,
            "field": "language",
            "defaultValue": "en_US",
            "description": "<p>the language of the user. Used for the website and mails</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/users/request-password-reset",
    "title": "request password reset",
    "name": "request_password_reset",
    "description": "<p>request a password reset in case of a forgotten password. Sends a link with instructions to reset the users password to the specified email address. The link is valid for 12 hours.</p>",
    "group": "Users",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>the email of the user to request the password reset for</p>"
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
            "field": "code",
            "description": "<p><code>Ok</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p><code>Password reset initiated</code></p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users"
  },
  {
    "type": "post",
    "url": "/users/me/resend-email-confirmation",
    "title": "request a resend of the email confirmation",
    "name": "resend_email_confirmation",
    "description": "<p>request to resend the E-mail for confirmation of said address. Sends a link with instructions to confirm the users email address.</p>",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "code",
            "description": "<p><code>Ok</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p><code>Email confirmation has been sent to &lt;emailaddress&gt;</code></p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/users/sign-in",
    "title": "Sign in",
    "name": "sign_in",
    "description": "<p>Sign in using email or name and password. The response contains a valid JSON Web Token. Always use <code>application/json</code> as content-type.</p>",
    "group": "Users",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>the email or name of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>the password of the user</p>"
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
            "field": "code",
            "description": "<p><code>Authorized</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p><code>Successfully signed in</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>valid json web token</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "refreshToken",
            "description": "<p>valid refresh token</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "data",
            "description": "<p><code>{ &quot;user&quot;: {&quot;name&quot;:&quot;fullname&quot;,&quot;email&quot;:&quot;test@test.de&quot;,&quot;role&quot;:&quot;user&quot;,&quot;language&quot;:&quot;en_US&quot;,&quot;boxes&quot;:[],&quot;emailIsConfirmed&quot;:false} }</code></p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>Unauthorized</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users"
  },
  {
    "type": "post",
    "url": "/users/sign-out",
    "title": "Sign out",
    "name": "sign_out",
    "description": "<p>Sign out using a valid JSON Web Token. Invalidates the current JSON Web Token</p>",
    "group": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "code",
            "description": "<p><code>Ok</code></p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p><code>Successfully signed out</code></p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          }
        ]
      }
    }
  },
  {
    "type": "put",
    "url": "/users/me",
    "title": "Update user details",
    "name": "updateUser",
    "description": "<p>Allows to change name, email, language and password of the currently signed in user. Changing the password triggers a sign out. The user has to log in again with the new password. Changing the mail triggers a Email confirmation process.</p>",
    "group": "Users",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "email",
            "description": "<p>the new email address for this user.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "language",
            "description": "<p>the new language for this user.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "name",
            "description": "<p>the new name for this user. The name must consist of at least 4 and up to 40 characters and only allows to use alphanumerics (a-zA-Z0-9), dots (.), dashes (-), underscores (_) and spaces. The first character must be a letter or number.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "newPassword",
            "description": "<p>the new password for this user. Should be at least 8 characters long.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "currentPassword",
            "description": "<p>the current password for this user.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./packages/api/lib/controllers/usersController.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>allows to send a valid JSON Web Token along with this request with <code>Bearer</code> prefix.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Authorization Header Example",
          "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q",
          "type": "String"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "403",
            "description": "<p>{&quot;code&quot;:&quot;Forbidden&quot;,&quot;message&quot;:&quot;Invalid JWT. Please sign sign in&quot;}</p>"
          }
        ]
      }
    }
  }
] });
