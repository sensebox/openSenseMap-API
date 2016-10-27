var SENSORS = [
  {
    title: 'Temperatur',
    unit: '°C',
    sensorType: 'HDC1008',
    icon: 'osem-thermometer'
  },
  {
    title: 'rel. Luftfeuchte',
    unit: '%',
    sensorType: 'HDC1008',
    icon: 'osem-humidity'
  },
  {
    title: 'Luftdruck',
    unit: 'hPa',
    sensorType: 'BMP280',
    icon: 'osem-barometer'
  },
  {
    title: 'Beleuchtungsstärke',
    unit: 'lx',
    sensorType: 'TSL45315',
    icon: 'osem-brightness'
  },
  {
    title: 'UV-Intensität',
    unit: 'μW/cm²',
    sensorType: 'VEML6070',
    icon: 'osem-brightness'
  }
];

module.exports = SENSORS;
