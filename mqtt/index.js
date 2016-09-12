'use strict';

let mqtt = require('mqtt');

module.exports = {
  initConnection (box) {
    console.log("WHOOOOOOOOOOOOOOOOOOOOOOOOP");
    console.log("trying to connect box" + box._id + " to mqtt");
    if (box.mqtt && box.mqtt.url && box.mqtt.topic) {
      console.log("credentials:", box.mqtt);
      let client = mqtt.connect(box.mqtt.url);

      client.on('connect', function () {
        console.log(box._id, "connected");
        client.subscribe(box.mqtt.topic);
      });

      client.on('message', function (topic, message) {
        console.log("message",topic,message);
        let json;
        try {
          json = JSON.parse(message.toString());
        } catch (err) {
          console.log(err);
        }

        if (typeof json !== 'undefined') {
          // try to save the json
          console.log(json);
          //box.saveMeasurementObject(json);
        }
      });
    }
  }
};
