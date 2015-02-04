var SENSORS = [
  {
    title: "Temperatur",
    unit: "°C",
    sensorType: "BMP085"
  },
  {
    title: "rel. Luftfeuchte",
    unit: "%",
    sensorType: "DHT11"
  },
  {
    title: "Luftdruck",
    unit: "Pa",
    sensorType: "BMP085"
  },
  {
    title: "Beleuchtungsstärke",
    unit: "lx",
    sensorType: "TSL2561"
  },
  {
    title: "Lautstärke",
    unit: "Schallpegel",
    sensorType: "LM358"
  }
];

module.exports = SENSORS;