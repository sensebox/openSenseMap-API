"use strict";

const { pgEnum } = require("drizzle-orm/pg-core");

const DeviceModelEnum = pgEnum("model", [
  "homeEthernet",
  "homeWifi",
  "homeLora",
  "homeV2Lora",
  "homeV2Ethernet",
  "homeV2Wifi",
  "senseBox:Edu",
  "luftdaten.info",
  "Custom",
]);

// Enum for device exposure types
const DeviceExposureEnum = pgEnum("exposure", [
  "indoor",
  "outdoor",
  "mobile",
  "unknown",
]);

const DeviceStatusEnum = pgEnum("status", ["active", "inactive", "old"]);

module.exports = {
  DeviceModelEnum,
  DeviceExposureEnum,
  DeviceStatusEnum,
};
