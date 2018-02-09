# openSenseMap API Changelog

## Unreleased
- Avoid moment usage in ClassifyTransformer

## v2
- Initial Release after splitting api and models
- add transformer for classifying the state of boxes
- Add descriptive statistics measurements transformer
- Add descriptive statistics route
- Move Measurements outlier detection into this package
- Use lorenwest/config for configuration
- Do stringification in this package instead of models package
- Expand tests
- Do logging in json format and not to folder
- Parse timestamps as RFC3339
- See https://github.com/sensebox/openSenseMap-API/pull/132
