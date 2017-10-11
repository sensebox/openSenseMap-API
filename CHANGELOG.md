# @sensebox/opensensemap-api-models Changelog

## Unreleased
- Re-add bunyan logging
- toLowerCase email parameter in User `initPasswordReset` to conform to rest of email address handling
- Fix case where addBox re-added existing box the the `boxes` array of an user
- Check if user is owner of box before removing
- Set email address to address from request when calling `confirmEmail` of user
- Only add legacy `loc` field to box if needed
- Validate that boxes need at least one sensor
- Move measurement deletion code from box to sensor
- Move findLastMeasurement from measurement to sensor
- Pin dependency mongoose to version 4.11.11
- Use `json` as default for `format` parameter of `Box.findBoxesLastMeasurements`
- Parse timestamps based on RFC 3339
- Convert RFC 3339 nanoseconds to milliseconds

## v0.0.1
- Initial Release after splitting api and models
