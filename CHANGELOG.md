# openSenseMap API Changelog

## v11.0.0

- Use @sensebox/opensensemap-api-models v3.0.0
- Update Github Action dependencies
- Update restify
- Update Readme information

## v10.2.3

- Use @sensebox/opensensemap-api-models v2.0.3
- Validate `near` parameter (#694)

## v10.2.2

- Use @sensebox/opensensemap-api-models v2.0.2

## v10.2.1

- Use @sensebox/opensensemap-api-models v2.0.1

## v10.2.0

- Use @sensebox/opensensemap-api-models v2.0.0
- Add Mattermost notifications (#664)
- Update dependencies (#629, #602, #666)
- Fix Mattermost messages (#689)
- Add `grouptag` parameter for downloads (#660)
- Add `sharedBoxes` functionality (#605)
- Add `count` parameter for getLastMeasurements (#588)

## v10.1.1

- Use @sensebox/opensensemap-api-models v1.2.0

## v10.1.0

- Update grouptag in management routes (#582)
- Move osem mongo dev image to api repo (#614)

## v10.0.3

- Use @sensebox/opensensemap-api-models v1.1.1

## v10.0.2

- Use @sensebox/opensensemap-api-models v1.1.0
- Update dependencies

## v10.0.0

- Use @sensebox/opensensemap-api-models v1.0.0
- Update CI
- Publish container on Github Registry
- Correct API documentation

## v9.4
- Add Cayenne LPP Decoding

## v9.3.5
- fix windspeed sensor

## v9.3.1
- Add windspeed sensor

## v9.2
- Include TTN EUIs and Key in LoRaWAN sketch

## v9
- Use Node 12
- Bump dependencies
- Bump sketch-templater for sound level meter

## v8

## v7
- Use @sensebox/opensensemap-api-models v0.0.12
- fix some bugs check CHANGELOG of models

## v6
- Use @sensebox/opensensemap-api-models v0.0.11
- Support for `hackAIR` devices
- Support for `bbox` query parameter on `/boxes`. Closes #174

## v5
- Allow users to delete their box images by sending `deleteImage: true`
- Change Forbidden Response for invalid JWT authorization
- Use @sensebox/opensensemap-api-models v0.0.10

## v4
- Include sensorId as default column in measurements download
- Add format parameter to bulk download and descriptive statistics routes
- Support json format in bulk download route
- Support json and tidy csv format in descriptive statistics route
- Use @sensebox/opensensemap-api-models v0.0.9

## v3
- Avoid moment usage in ClassifyTransformer
- Use @sensebox/opensensemap-api-models v0.0.8

## v2
- Initial Release after splitting api and models
- add transformer for classifying the state of boxes
- Remove passport dependency
- Add descriptive statistics measurements transformer
- Add descriptive statistics route
- Move Measurements outlier detection into this package
- Use lorenwest/config for configuration
- Do stringification in this package instead of models package
- Expand tests
- Do logging in json format and not to folder
- Parse timestamps as RFC3339
- See https://github.com/sensebox/openSenseMap-API/pull/132
