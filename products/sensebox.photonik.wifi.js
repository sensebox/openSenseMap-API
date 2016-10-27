var SENSORS = [
  {
    title: 'Temperatur',
    unit: '°C',
    sensorType: 'DHT11',
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
    title: 'Beleuchtungsstärke',
    unit: 'lx',
    sensorType: 'TSL2561',
    icon: 'osem-brightness'
  },
  {
    title: 'UV',
    unit: 'µW/cm²',
    sensorType: 'GUVA-S12D',
    icon: 'osem-brightness'
  }
];

module.exports = SENSORS;
