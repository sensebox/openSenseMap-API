var SENSORS = [
  {
    title: 'Temperatur',
    unit: '°C',
    sensorType: 'DHT11'
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
    title: 'Beleuchtungsstärke',
    unit: 'lx',
    sensorType: 'TSL2561'
  },
  {
    title: 'UV',
    unit: 'µW/cm²',
    sensorType: 'GUVA-S12D'
  }
];

module.exports = SENSORS;