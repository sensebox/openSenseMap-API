'use strict';

/* global describe it before after */
const expect = require('chai').expect,
  { db: { connect, mongoose }, Box, Measurement } = require('../../index'),
  dbConnectionString = require('../helpers/dbConnectionString'),
  senseBox = require('../helpers/senseBox'),
  moment = require('moment'),
  parseISO8601 = require('../helpers/iso8601'),
  shouldBeABox = require('../helpers/shouldBeABox'),
  shouldBeABoxWithSecrets = require('../helpers/shouldBeABoxWithSecrets'),
  checkBoxLocation = require('../helpers/checkBoxLocation'),
  initBoxWithMeasurements = require('../helpers/initBoxWithMeasurements'),
  ensureIndexes = require('../helpers/ensureIndexes'),
  fs = require('fs');

const shouldNotHappenThenner = function (err) {
  /* eslint-disable no-console */
  console.log(err);
  /* eslint-enable no-console */
  expect(false).true;
};

describe('Box model', function () {
  const testBoxes = {};

  before(function () {
    return connect(dbConnectionString({ db: 'boxTest' }))
      .then(() => ensureIndexes());
  });

  after(function () {
    mongoose.disconnect();
  });

  describe('Box creation', function () {
    it('should allow to create a box', function () {
      return Box.initNew(senseBox())
        .then(shouldBeABox)
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          expect(box.name).equal('testSensebox');
          expect(box.grouptag).not.exist;
          expect(box.model).equal('homeEthernet');

          expect(box.integrations.mqtt.enabled).false;

          expect(box.locations).an('array');
          for (const loc of box.locations) {
            checkBoxLocation(loc);
          }

          testBoxes[box._id] = box;
        });
    });

    it('should persist integrations and other properties upon creation', function () {
      const box = senseBox({
        name: 'integrationsbox',
        grouptag: 'grouptagTest',
        exposure: 'outdoor',
        ttn: {
          dev_id: 'test_devid',
          app_id: 'test_appid',
          port: 55,
          profile: 'lora-serialization',
          decodeOptions: []
        },
        mqtt: {
          enabled: true,
          url: 'mqtt://testbroker',
          topic: 'some/test/topic',
          connectionOptions: '{}',
          decodeOptions: '{}',
          messageFormat: 'csv'
        }
      });

      return Box.initNew(box)
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(shouldBeABox)
        .then(function ({ integrations, name, grouptag, exposure }) {
          expect(name).equal('integrationsbox');

          expect(grouptag).equal('grouptagTest');

          expect(exposure).equal('outdoor');

          expect(integrations).an('object');
          expect(integrations).not.empty;

          expect(integrations.ttn).an('object');
          expect(integrations.ttn).not.empty;
          expect(integrations.ttn.dev_id).equal('test_devid');
          expect(integrations.ttn.app_id).equal('test_appid');
          expect(integrations.ttn.port).equal(55);
          expect(integrations.ttn.profile).equal('lora-serialization');
          expect(integrations.ttn.decodeOptions).an('array');
          expect(integrations.ttn.decodeOptions).lengthOf(0);

          expect(integrations.mqtt).an('object');
          expect(integrations.mqtt).not.empty;
          expect(integrations.mqtt.enabled).true;
          expect(integrations.mqtt.url).equal('mqtt://testbroker');
          expect(integrations.mqtt.topic).equal('some/test/topic');
          expect(integrations.mqtt.connectionOptions).equal('{}');
          expect(integrations.mqtt.decodeOptions).equal('{}');
          expect(integrations.mqtt.messageFormat).equal('csv');

          testBoxes[box._id] = box;
        });
    });

    it('should allow to create a custom senseBox with custom sensors', function () {
      const box = senseBox({
        sensors: [
          {
            title: 'customSensor0',
            unit: 'customUnit0',
            sensorType: 'customSensorType0'
          },
          {
            title: 'customSensor1',
            unit: 'customUnit1',
            sensorType: 'customSensorType1'
          },
          {
            title: 'customSensor2',
            unit: 'customUnit2',
            sensorType: 'customSensorType2'
          },
          {
            title: 'customSensor3',
            unit: 'customUnit3',
            sensorType: 'customSensorType3'
          },
          {
            title: 'customSensor4',
            unit: 'customUnit4',
            sensorType: 'customSensorType4',
            icon: 'icon!'
          }
        ]
      });

      return Box.initNew(box)
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(shouldBeABox)
        .then(function ({ sensors, model }) {
          expect(model).equal('custom');

          expect(sensors).an('array');
          expect(sensors).not.empty;

          for (const [
            index,
            { title, unit, sensorType, icon }
          ] of sensors.entries()) {
            expect(title.includes('customSensor')).true;
            expect(title.endsWith(index.toString(10))).true;

            expect(unit.includes('customUnit')).true;
            expect(unit.endsWith(index.toString(10))).true;

            expect(sensorType.includes('customSensorType')).true;
            expect(sensorType.endsWith(index.toString(10))).true;

            if (index === sensors.length - 1) {
              expect(icon).equal('icon!');
            }
          }

          testBoxes[box._id] = box;
        });
    });

    it('should not allow to specify sensors and model at the same time', function () {
      const box = senseBox({
        sensors: [{ title: 'sensor', unit: '%', sensorType: 'dummy' }]
      });

      box.model = 'homeEthernet';

      return Box.initNew(box).then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal(
            'Parameters model and sensors cannot be specified at the same time.'
          );
        });
    });

    it('should not allow to specify unknown model', function () {
      return Box.initNew(senseBox({ model: 'fancyNewModel' }))
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal(
            'Box validation failed: model: `fancyNewModel` is not a valid enum value for path `model`., sensors: sensors are required if model is invalid or missing.'
          );
        });
    });

    it('should not be possible to create a box with empty array for sensors', function () {
      const box = senseBox();

      box.model = 'custom';
      box.sensors = [];

      return Box.initNew(box).then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal(
            'Parameters model and sensors cannot be specified at the same time.'
          );
        });
    });
  });

  describe('findBoxById', function () {
    it('should return the public properties', function () {
      const boxId = Object.keys(testBoxes)[0];

      return (
        Box.findBoxById(boxId)
          // .then(shouldBeABox)
          .then(function (box) {
            expect(box.loc).an('array');
            expect(box.loc).lengthOf(1);
            expect(box.loc[0].type).equal('Feature');
            checkBoxLocation(box.loc[0].geometry);
          })
      );
    });

    it('should allow to include secrets', function () {
      const boxId = Object.keys(testBoxes)[0];

      return Box.findBoxById(boxId, { includeSecrets: true })
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          expect(box.loc).an('array');
          expect(box.loc).lengthOf(1);
          expect(box.loc[0].type).equal('Feature');
          checkBoxLocation(box.loc[0].geometry);
        });
    });

    it('should allow to show only last measurements', function () {
      const boxId = Object.keys(testBoxes)[0];
      const measurements = Measurement.decodeMeasurements(
        testBoxes[boxId].sensors.map(s => {
          return { sensor_id: s._id.toString(), value: 2 };
        })
      );

      return Box.findById(boxId)
        .then(function (box) {
          return measurements.then(function (ms) {
            return box.saveMeasurementsArray(ms);
          });
        })
        .then(function () {
          return Box.findBoxById(boxId, { onlyLastMeasurements: true });
        })
        .then(function (lastMeasurements) {
          expect(Object.keys(lastMeasurements)).members(['_id', 'sensors']);

          for (const { lastMeasurement } of lastMeasurements.sensors) {
            expect(lastMeasurement).an('object');
            expect(Object.keys(lastMeasurement)).members([
              'value',
              'createdAt'
            ]);
            expect(parseISO8601(lastMeasurement.createdAt).isValid()).true;
          }
        });
    });

    it('should allow to show only locations', function () {
      const boxId = Object.keys(testBoxes)[0];

      return Box.findBoxById(boxId, { onlyLocations: true }).then(function (
        locations
      ) {
        expect(Object.keys(locations)).members(['_id', 'locations']);
        expect(locations.locations).an('array');
        for (const loc of locations.locations) {
          checkBoxLocation(loc);
        }
      });
    });

    it('should allow to return box as geojson', function () {
      const boxId = Object.keys(testBoxes)[0];

      return Box.findBoxById(boxId, { format: 'geojson' }).then(function (
        geojsonBox
      ) {
        expect(geojsonBox).an('object');
        expect(geojsonBox.type).equal('Feature');
        expect(geojsonBox.geometry).an('object');

        expect(geojsonBox.geometry.coordinates).an('array');
        expect(geojsonBox.geometry.coordinates).lengthOf.within(2, 3);
        for (const coord of geojsonBox.geometry.coordinates) {
          expect(coord).a('number');
        }
        expect(Math.abs(geojsonBox.geometry.coordinates[0])).most(180);
        expect(Math.abs(geojsonBox.geometry.coordinates[1])).most(90);
      });
    });

    it('should allow to disable population and specify own projection', function () {
      const boxId = Object.keys(testBoxes)[0];

      return Box.findBoxById(boxId, {
        populate: false,
        projection: { name: 1, integrations: 1, exposure: 1, _id: 0 }
      }).then(function (result) {
        expect(Object.keys(result)).members([
          'name',
          'integrations',
          'exposure'
        ]);
      });
    });
  });

  describe('JSON serialization', function () {
    it('should only serialize public properties', function () {
      const boxId = Object.keys(testBoxes)[0];

      return Box.findById(boxId).then(function (box) {
        const json = box.toJSON();

        expect(Object.keys(json)).members([
          'createdAt',
          'exposure',
          'model',
          'grouptag',
          'image',
          'name',
          'updatedAt',
          'currentLocation',
          'sensors',
          'description',
          'weblink',
          '_id',
          'loc'
        ]);
      });
    });
  });

  describe('Updating properties of a box', function () {
    it('should allow to delete multiple sensors in one request', function () {
      let sensorsToDelete;

      return initBoxWithMeasurements()
        .then(function (box) {
          sensorsToDelete = box.sensors.map(function (sensor) {
            return { deleted: true, _id: sensor._id };
          });

          sensorsToDelete = sensorsToDelete.slice(0, -1);

          return box.updateBox({ sensors: sensorsToDelete });
        })
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(function ({ sensors }) {
          expect(sensors).lengthOf(1);
          for (const { _id } of sensors) {
            expect(sensorsToDelete.findIndex(s => _id.equals(s._id))).equal(-1);
          }

          return Measurement.count({
            sensor_id: { $in: sensorsToDelete.map(s => s._id) }
          });
        })
        .then(function (count) {
          expect(count).equal(0);
        });
    });

    it('should allow to add a sensor to a box through updateBox', function () {
      const newSensor = {
        title: 'newPhenomenon',
        unit: 'newUnit',
        icon: 'newIcon',
        sensorType: 'newSensorType',
        new: true,
        edited: true
      };
      let numberOfSensors;

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          numberOfSensors = box.sensors.length;

          return box.updateBox({ sensors: [newSensor] });
        })
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(function (box) {
          expect(box.sensors).lengthOf(numberOfSensors + 1);
          const addedSensor = box.sensors[box.sensors.length - 1];

          expect(addedSensor.title).equal(newSensor.title);
          expect(addedSensor.unit).equal(newSensor.unit);
          expect(addedSensor.sensorType).equal(newSensor.sensorType);
          expect(addedSensor.icon).equal(newSensor.icon);
        });
    });

    it('should allow to edit a sensor', function () {
      let sensorToEdit;

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          sensorToEdit = box.sensors[2];

          sensorToEdit.edited = true;
          sensorToEdit.title = 'new Title';
          sensorToEdit.unit = 'new Unit';
          sensorToEdit.sensorType = 'new sensorType';

          return box.updateBox({ sensors: [sensorToEdit] });
        })
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(function (box) {
          const updatedSensor = box.sensors[2];

          expect(updatedSensor.title).equal(sensorToEdit.title);
          expect(updatedSensor.unit).equal(sensorToEdit.unit);
          expect(updatedSensor.sensorType).equal(sensorToEdit.sensorType);
          expect(updatedSensor.icon).equal(sensorToEdit.icon);
        });
    });

    it('should not allow to delete all sensors of a box at once', function () {
      let sensorsToDelete;

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          sensorsToDelete = box.sensors.map(function (sensor) {
            return { deleted: true, _id: sensor._id };
          });

          return box.updateBox({ sensors: sensorsToDelete });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal(
            'Unable to delete sensor(s). A box needs at least one sensor.'
          );
        });
    });

    it('should not allow to delete all sensors of a box one by one', function () {
      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return box.updateBox({
            sensors: [{ deleted: true, _id: box.sensors[0]._id }]
          });
        })
        .then(function (box) {
          return box.updateBox({
            sensors: [{ deleted: true, _id: box.sensors[0]._id }]
          });
        })
        .then(function (box) {
          return box.updateBox({
            sensors: [{ deleted: true, _id: box.sensors[0]._id }]
          });
        })
        .then(function (box) {
          return box.updateBox({
            sensors: [{ deleted: true, _id: box.sensors[0]._id }]
          });
        })
        .then(function (box) {
          return box.updateBox({
            sensors: [{ deleted: true, _id: box.sensors[0]._id }]
          });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal(
            'Unable to delete sensor(s). A box needs at least one sensor.'
          );
        });
    });

    let boxid;

    it('should allow to change name the basic string properties of a box', function () {
      const updatePayload = {
        name: 'new Name',
        exposure: 'outdoor',
        grouptag: 'new Grouptag',
        weblink: 'http://www.opensensemap.org',
        image: {
          type: 'png',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
        },
        description: 'this is the new description'
      };

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return box.updateBox(updatePayload);
        })
        .then(function (box) {
          boxid = box._id;

          return Box.findById(box._id);
        })
        .then(function ({
          name,
          exposure,
          grouptag,
          weblink,
          image,
          description
        }) {
          expect(name).equal(updatePayload.name);
          expect(exposure).equal(updatePayload.exposure);
          expect(grouptag).equal(updatePayload.grouptag);
          expect(weblink).equal(updatePayload.weblink);
          expect(description).equal(updatePayload.description);
          expect(
            moment().diff(
              moment(parseInt(image.split('_')[1].slice(0, -4), 36) * 1000)
            )
          ).to.be.below(1000);
          expect(fs.existsSync(`/userimages/${image}`)).true;
        });
    });

    it('should allow to delete the image of a box', async function () {
      let box = await Box.findById(boxid);
      expect(box.image).not.empty;
      expect(fs.existsSync(`/userimages/${box.image}`)).true;
      await box.updateBox({ image: 'deleteImage' });
      box = await Box.findById(boxid);
      expect(box.image).not.exist;
      expect(fs.existsSync(`/userimages/${box.image}`)).false;
    });

    it('should not allow to change name of a box to empty string', function () {
      const updatePayload = { name: '' };

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return box.updateBox(updatePayload);
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal(
            'Box validation failed: name: Path `name` is required.'
          );
        });
    });

    it('should allow to unset grouptag, description and weblink of a box', function () {
      const updatePayload = {
        grouptag: 'new Grouptag',
        weblink: 'http://www.opensensemap.org',
        description: 'this is the new description'
      };

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return box.updateBox(updatePayload);
        })
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(function (box) {
          expect(box.grouptag).equal(updatePayload.grouptag);
          expect(box.weblink).equal(updatePayload.weblink);
          expect(box.description).equal(updatePayload.description);

          updatePayload.grouptag = '';
          updatePayload.weblink = '';
          updatePayload.description = '';

          return box.updateBox(updatePayload);
        })
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(function ({ grouptag, weblink, description }) {
          expect(grouptag).not.exist;
          expect(weblink).not.exist;
          expect(description).not.exist;
        });
    });

    it('should allow to set ttn settings', function () {
      const updatePayload = {
        ttn: {
          app_id: 'some_app_id',
          dev_id: 'some_dev_id',
          profile: 'sensebox/home'
        }
      };

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return box.updateBox(updatePayload);
        })
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(function ({ integrations: { ttn: { app_id, dev_id, profile } } }) {
          expect(app_id).equal(updatePayload.ttn.app_id);
          expect(dev_id).equal(updatePayload.ttn.dev_id);
          expect(profile).equal(updatePayload.ttn.profile);
        });
    });

    it('should allow to set mqtt settings', function () {
      const updatePayload = {
        mqtt: {
          enabled: true,
          url: 'mqtt://somebroker',
          topic: 'some/topic',
          connectionOptions: '',
          decodeOptions: '',
          messageFormat: 'csv'
        }
      };

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return box.updateBox(updatePayload);
        })
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(function ({
          integrations: {
            mqtt: {
              enabled,
              url,
              topic,
              decodeOptions,
              connectionOptions,
              messageFormat
            }
          }
        }) {
          expect(enabled).equal(updatePayload.mqtt.enabled);
          expect(url).equal(updatePayload.mqtt.url);
          expect(topic).equal(updatePayload.mqtt.topic);
          expect(decodeOptions).equal(updatePayload.mqtt.decodeOptions);
          expect(connectionOptions).equal(updatePayload.mqtt.connectionOptions);
          expect(messageFormat).equal(updatePayload.mqtt.messageFormat);
        });
    });

    it('should allow to add feinstaub addon to box', function () {
      const updatePayload = { addons: { add: 'feinstaub' } };

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          return box.updateBox(updatePayload);
        })
        .then(function (box) {
          return Box.findById(box._id);
        })
        .then(function ({ model, sensors }) {
          expect(
            sensors.some(function ({ unit, sensorType, title }) {
              return (
                unit === 'µg/m³' && sensorType === 'SDS 011' && title === 'PM10'
              );
            })
          ).true;
          expect(
            sensors.some(function ({ unit, sensorType, title }) {
              return (
                unit === 'µg/m³' &&
                sensorType === 'SDS 011' &&
                title === 'PM2.5'
              );
            })
          ).true;
          expect(model.includes('Feinstaub')).true;
        });
    });
  });

  describe('Box deletion', function () {
    it('should allow to delete a box', function () {
      let boxId;

      return Box.initNew(senseBox())
        .then(shouldBeABoxWithSecrets)
        .then(function (box) {
          boxId = box._id;

          return box.removeSelfAndMeasurements();
        })
        .then(function () {
          return Box.findById(boxId);
        })
        .then(function (box) {
          expect(box).not.exist;
        });
    });
  });
});
