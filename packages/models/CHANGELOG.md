# @sensebox/opensensemap-api-models Changelog

## Unreleased

## v1.2.0

- Extend `luftdatenHandler` (#578)
- Add workflow to transfer a device to different account (#525)

## v1.1.1

- Update @sensebox/node-sketch-templater to v1.12.1

## v1.1.0

- Add DPS310 sensor
- Update migrations
- Update @sensebox/node-sketch-templater to v1.12.0

## v1.0.0

- Update @sensebox/node-sketch-templater to v1.11.2
- `grouptag` changed from `string` to `array`
- Allow mqtts nad wss for mqtt-integration

## v0.0.32-beta.0
- Allow mqtts nad wss for mqtt-integration

## v0.0.31
- Update @sensebox/node-sketch-templater to v1.10.5

## v0.0.30
- Update @sensebox/node-sketch-templater to v1.10.4

## v0.0.29
- Update @sensebox/node-sketch-templater to v1.10.3

## v0.0.28
- Update @sensebox/node-sketch-templater to v1.10.2

## v0.0.27
- Update @sensebox/node-sketch-templater to v1.10.1

## v0.0.26
- Update @sensebox/node-sketch-templater to v1.8.3

## v0.0.26-beta.2

## v0.0.26-beta.1

## v0.0.26-beta.0
- Authorization

## v0.0.25
- Add Cayenne LPP Decoder

## v0.0.24

## v0.0.23
- Update @sensebox/node-sketch-templater to v1.8.2

## v0.0.22

## v0.0.21
- Update @sensebox/node-sketch-templater to v1.8.0
- Add windspeed sensor

## v0.0.20
- Update @sensebox/node-sketch-templater to v1.7.0

## v0.0.19

## v0.0.18

## v0.0.17

## v0.0.16-beta.3
- Merge fix-userParamError branch

## v0.0.16-beta.2
- Update @sensebox/node-sketch-templater to v1.7.0-beta2

## v0.0.16-beta
- Update @sensebox/node-sketch-templater to v1.7.0-beta
- Add TTN IDs / Key to getSketch params

## v0.0.15
- Update @sensebox/node-sketch-templater to v1.5.4

## v0.0.14
- Update @sensebox/node-sketch-templater to v1.5.2
- Add SoundLevelMeter

## v0.0.13
- Add BME680 Sensor
- Update @sensebox/node-sketch-templater to v1.5.1

## v0.0.12
- Update @sensebox/node-sketch-templater to 1.4.0
- set lastMeasurementAt on single measruement upload fixes #177

## v0.0.11
- **BREAKING CHANGE**: `/boxes` sensor does not contain `lastMeasurement` anymore
- introduce `minimal` parameter to reduce payload on `/boxes` #164
- introduce `lastMeasurementAt` in box schema and update field every time new measurement is stored to avoid additional databse lookup. Fixes #148
- Uploading a single measurement with a specified time. Fixes #169
- Update @sensebox/node-sketch-templater to 1.3.0
- Add new LoRa model (`homeV2Lora`). Fixes #165
- add `bbox` parameter to `/boxes` route
- add `hackAir` decoding handler

## v0.0.11-beta.2

## v0.0.11-beta.1

## v0.0.11-beta.0

## v0.0.10
- Remove format argument of findBoxById
- Remove box.updateImage
- Implement deletion of box images
- Allow updating of box model value
- Add 'includeSecrets' to user model toJSON
- Expose 'passwordReset' method of user documents
- Add 'findUserOfBox' and 'transferOwnershipOfBox' methods to user model
- Add 'sendMails' parameter to destroyUser user model method to silently delete users
- Update @sensebox/node-sketch-templater to 1.2.0
- Add new MCU models

## v0.0.9
- Fix measurements with 'content-type: json' not parsed with JSON.parse.
- Update grpc to 1.9.1

## v0.0.8
- Expand .npmignore

## v0.0.7
- Fix an error where invalid timestamps were displayed as NaN in returned error messages
- More strict timestamp parsing (With tests)
- Remove "stream-transform", "simple-statistics", "csv-stringify" and "stringify-stream" depencies
- Use mongoose built-in `QueryCursor#map` for data transformation
- do not populate lastMeasurements in Box.findMeasurementsOfBoxesStream
- Move Measurements outlier computation into api package

## v0.0.6
- Added mqtt-osem-integration MQTT service connection
- Use single client certificate for all integrations
- Removed cert and key fields in mqtt and mailer integration configuration
- Added cert and key fields for integrations client certificate configuration
- Validate user language input. Fixes #133
- move stringifier from box model to box controller in api for route `/boxes`

## v0.0.5
- Removed log to file on error
- cleanup unused files and directories
- useMongoClient in db connection
- Upgrade @sensebox/node-sketch-templater to 1.1.1
- Use got instead of request for communication with the mailer
- Move JWT handling into the api
- Remove jsonwebtoken dependency
- Use lorenwest/node-config for configuration

## v0.0.4
- No Changes

## v0.0.3
- Fix destructuring error in json and luftdaten measurement decoding

## v0.0.2
- Re-add bunyan logging
- toLowerCase email parameter in User `initPasswordReset` to conform to rest of email address handling
- Fix case where addBox re-added existing box the the `boxes` array of an user
- Check if user is owner of box before removing
- Set email address to address from request when calling `confirmEmail` of user
- Only add legacy `loc` field to box if needed
- Validate that boxes need at least one sensor
- Move measurement deletion code from box to sensor
- Move findLastMeasurement from measurement to sensor
- Pin dependency mongoose to version 4.13.6
- Use `json` as default for `format` parameter of `Box.findBoxesLastMeasurements`
- Parse timestamps based on RFC 3339
- Convert RFC 3339 nanoseconds to milliseconds
- Include PMS.. sensor models definitions from Adorfer
- Populate boxes in getBoxes of User

## v0.0.1
- Initial Release after splitting api and models
