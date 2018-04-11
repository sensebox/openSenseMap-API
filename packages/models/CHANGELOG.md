# @sensebox/opensensemap-api-models Changelog

## Unreleased
- Remove format argument of findBoxById
- Remove box.updateImage
- Implement deletion of box images
- Allow updating of box model value
- Add 'includeSecrets' to user model toJSON
- Expose 'passwordReset' method of user documents
- Add 'findUserOfBox' and 'transferOwnershipOfBox' methods to user model
- Add 'sendMails' parameter to destroyUser user model method to silently delete users

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
