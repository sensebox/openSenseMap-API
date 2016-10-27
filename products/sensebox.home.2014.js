var SENSORS = [
  {
    title: 'Temperatur',
    unit: '°C',
    sensorType: 'BMP085',
    icon: 'osem-thermometer'
  },
  {
    title: 'rel. Luftfeuchte',
    unit: '%',
    sensorType: 'DHT11',
    icon: 'osem-humidity'
  },
  {
    title: 'Luftdruck',
    unit: 'Pa',
    sensorType: 'BMP085',
    icon: 'osem-barometer'
  },
  {
    title: 'Lautstärke',
    unit: 'Schallpegel',
    sensorType: 'LM358',
    icon: 'osem-volume-up'
  },
  {
    title: 'Helligkeit',
    unit: 'Lichtpegel',
    sensorType: 'GL5528',
    icon: 'osem-brightness'
  }
];

module.exports = SENSORS;
