var SENSORS = [
  {
    title: 'Temperatur',
    unit: '°C',
    sensorType: 'BMP085'
  },
  {
    title: 'rel. Luftfeuchte',
    unit: '%',
    sensorType: 'DHT11'
  },
  {
    title: 'Luftdruck',
    unit: 'Pa',
    sensorType: 'BMP085'
  },
  {
    title: 'Lautstärke',
    unit: 'Schallpegel',
    sensorType: 'LM358'
  },
  {
    title: 'Helligkeit',
    unit: 'Lichtpegel',
    sensorType: 'GL5528'
  }
];

module.exports = SENSORS;