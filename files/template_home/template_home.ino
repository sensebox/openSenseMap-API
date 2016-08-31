/*
  senseBox Home - Citizen Sensingplatform
  Version: 2.2
  Date: 2016-08-25
  Homepage: https://www.sensebox.de https://opensensemap.org
  Author: Jan Wirwahn, Institute for Geoinformatics, University of Muenster
  Note: Sketch for senseBox Home Kit
  Email: support@sensebox.de
*/

#include <Wire.h>
#include "HDC100X.h"
#include "BMP280.h"
#include <Makerblog_TSL45315.h>
#include <SPI.h>
#include <Ethernet.h>

//senseBox ID

//Sensor IDs

//Configure ethernet connection
IPAddress myIp(192, 168, 0, 42);
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
char server[] = "@@OSEM_POST_DOMAIN@@";
EthernetClient client;

//Load sensors
Makerblog_TSL45315 TSL = Makerblog_TSL45315(TSL45315_TIME_M4);
HDC100X HDC(0x43);
BMP280 BMP;

//measurement variables
float temperature = 0;
float humidity = 0;
double tempBaro, pressure;
uint32_t lux;
uint16_t uv;
int messTyp;
#define UV_ADDR 0x38
#define IT_1   0x1

const unsigned int postingInterval = 60000;

void setup() {
  // Open serial communications and wait for port to open:
  Serial.begin(9600);
  // start the Ethernet connection:
  Serial.println("senseBox Home software version 2.2");
  Serial.println();
  Serial.print("Starting ethernet connection...");

  if (Ethernet.begin(mac) == 0) {
    Serial.println("Failed to configure Ethernet using DHCP");
    Ethernet.begin(mac, myIp);
  } else {
    Serial.println("done!");
  }
  delay(1000);
  //Initialize sensors
  Serial.print("Initializing sensors...");
  Wire.begin();
  Wire.beginTransmission(UV_ADDR);
  Wire.write((IT_1 << 2) | 0x02);
  Wire.endTransmission();
  delay(500);
  HDC.begin(HDC100X_TEMP_HUMI, HDC100X_14BIT, HDC100X_14BIT, DISABLE);
  TSL.begin();
  BMP.begin();
  BMP.setOversampling(4);
  Serial.println("done!");
  Serial.println("Starting loop.");
  temperature = HDC.getTemp();
}

void loop() {
  // if there are incoming bytes available
  // from the server, read them and print them:
  if (client.available()) {
    char c = client.read();
    Serial.print(c);
    //Serial.write(c);
  }

  //-----Pressure-----//
  Serial.println("Posting pressure");
  messTyp = 2;
  char result = BMP.startMeasurment();
  if (result != 0) {
    delay(result);
    result = BMP.getTemperatureAndPressure(tempBaro, pressure);
    postObservation(pressure, PRESSURESENSOR_ID, SENSEBOX_ID);
  }
  delay(2000);
  //-----Humidity-----//
  Serial.println("Posting humidity");
  messTyp = 2;
  humidity = HDC.getHumi();
  postObservation(humidity, HUMISENSOR_ID, SENSEBOX_ID);
  delay(2000);
  //-----Temperature-----//
  Serial.println("Posting temperature");
  messTyp = 2;
  temperature = HDC.getTemp();
  postObservation(temperature, TEMPSENSOR_ID, SENSEBOX_ID);
  delay(2000);
  //-----Lux-----//
  Serial.println("Posting illuminance");
  messTyp = 1;
  lux = TSL.readLux();
  postObservation(lux, LUXSENSOR_ID, SENSEBOX_ID);
  delay(2000);
  //UV intensity
  messTyp = 1;
  uv = getUV();
  postObservation(uv, UVSENSOR_ID, SENSEBOX_ID);

  sleep(postingInterval);
}

void postObservation(float measurement, String sensorId, String boxId) {
  char obs[10];
  if (messTyp == 1) dtostrf(measurement, 5, 0, obs);
  else if (messTyp == 2) dtostrf(measurement, 5, 2, obs);
  Serial.println(obs);
  //json must look like: {"value":"12.5"}
  //post observation to: /boxes/boxId/sensorId
  Serial.println("connecting...");
  String value = "{\"value\":";
  value += obs;
  value += "}";
  if (client.connect(server, 8000))
  {
    Serial.println("connected");
    // Make a HTTP Post request:
    client.print("POST /boxes/");
    client.print(boxId);
    client.print("/");
    client.print(sensorId);
    client.println(" HTTP/1.1");
    // Send the required header parameters
    client.print("Host:");
    client.println(server);
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.print("Content-Length: ");
    client.println(value.length());
    client.println();
    // Send the data
    client.print(value);
    client.println();
  }
  waitForResponse();
}

void waitForResponse()
{
  // if there are incoming bytes available
  // from the server, read them and print them:
  boolean repeat = true;
  do {
    if (client.available())
    {
      char c = client.read();
      Serial.print(c);
    }
    // if the servers disconnected, stop the client:
    if (!client.connected())
    {
      Serial.println();
      Serial.println("disconnecting.");
      client.stop();
      repeat = false;
    }
  }
  while (repeat);
}

uint16_t getUV() {
  byte msb = 0, lsb = 0;
  uint16_t uvValue;

  Wire.requestFrom(UV_ADDR + 1, 1); //MSB
  delay(1);
  if (Wire.available()) msb = Wire.read();

  Wire.requestFrom(UV_ADDR + 0, 1); //LSB
  delay(1);
  if (Wire.available()) lsb = Wire.read();

  uvValue = (msb << 8) | lsb;

  return uvValue * 5;
}

// millis() rollover fix - http://arduino.stackexchange.com/questions/12587/how-can-i-handle-the-millis-rollover
void sleep(unsigned long ms) {            // ms: duration
  unsigned long start = millis();         // start: timestamp
  for (;;) {
    unsigned long now = millis();         // now: timestamp
    unsigned long elapsed = now - start;  // elapsed: duration
    if (elapsed >= ms)                    // comparing durations: OK
      return;
  }
}
