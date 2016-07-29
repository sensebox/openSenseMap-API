var SENSORS = [
  {
    title: 'Temperatur',
    unit: '°C',
    sensorType: 'HDC1008'
  },
  {
    title: 'rel. Luftfeuchte',
    unit: '%',
    sensorType: 'HDC1008'
  },
  {
    title: 'Luftdruck',
    unit: 'hPa',
    sensorType: 'BMP280'
  },
  {
    title: 'Beleuchtungsstärke',
    unit: 'lx',
    sensorType: 'TSL45315'
  },
  {
    title: 'UV-Intensität',
    unit: 'μW/cm²',
    sensorType: 'VEML6070'
  }
];

module.exports = SENSORS;