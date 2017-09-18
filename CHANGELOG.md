# @sensebox/opensensemap-api-models Changelog

## Unreleased
- Re-add bunyan logging
- toLowerCase email parameter in User `initPasswordReset` to conform to rest of email address handling
- Fix case where addBox re-added existing box the the `boxes` array of an user
- Check if user is owner of box before removing

## v0.0.1
- Initial Release after splitting api and models
