# @sensebox/opensensemap-api-models Changelog

## Unreleased
- Removed log to file on error
- cleanup unused files and directories
- useMongoClient in db connection
- Upgrade @sensebox/node-sketch-templater to 1.0.10
- Use got instead of request for communication with the mailer
- Move JWT handling into the api
- Remove jsonwebtoken dependency

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
