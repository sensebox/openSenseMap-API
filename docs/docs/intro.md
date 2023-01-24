---
sidebar_position: 1
---
# Introduction

![openSenseMap API](https://raw.githubusercontent.com/sensebox/resources/master/images/openSenseMap_API_github.png)

Documentation of the routes and methods to manage [users](#api-Users), [stations (also called boxes or senseBoxes)](#api-Boxes), and [measurements](#api-Measurements) in the openSenseMap API.
You can find the API running at [https://api.opensensemap.org/](https://api.opensensemap.org/).

## Timestamps

Please note that the API handles every timestamp in [Coordinated universal time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time) time zone. Timestamps in parameters should be in RFC 3339 notation.

Timestamp without Milliseconds:

    2018-02-01T23:18:02Z

Timestamp with Milliseconds:

    2018-02-01T23:18:02.412Z

## IDs

All stations and sensors of stations receive a unique public identifier. These identifiers are exactly 24 character long and only contain digits and characters a to f.

Example:

    5a8d1c25bc2d41001927a265

## Parameters

Only if noted otherwise, all requests assume the payload encoded as JSON with `Content-type: application/json` header. Parameters prepended with a colon (`:`) are parameters which should be specified through the URL.

## Source code and Licenses

You can find the whole source code of the API at GitHub in the [sensebox/openSenseMap-API](https://github.com/sensebox/openSenseMap-API) repository. You can obtain the code under the MIT License.

The data obtainable through the openSenseMap API at [https://api.opensensemap.org/](https://api.opensensemap.org/) is licensed under the [Public Domain Dedication and License 1.0](https://opendatacommons.org/licenses/pddl/summary/).

If you there is something unclear or there is a mistake in this documentation please open an [issue](https://github.com/sensebox/openSenseMap-API/issues/new) in the GitHub repository.
