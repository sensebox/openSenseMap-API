/*
SenseBox Citizen Sensingplatform
Version: 1.2
Date: 2015-01-06
Homepage: http://sensebox.uni-muenster.de/bestellen/fuer-buerger/
Author: Jan Wirwahn
Note: Version with additional sensors for GIS-GK@ifgi
*/

#include <Wire.h>
#include <SPI.h>
#include <EthernetV2_0.h>
#include <DHT.h>
#include <Barometer.h>
#include <Digital_Light_TSL2561.h>
#include <avr/wdt.h>

//SenseBox ID

//Sensor IDs

//Sensor pin settings
#define NOISEPIN A0
#define DHTPIN A1
#define UVPIN A2
#define DHTTYPE DHT11
//Ethernet shield settings
#define W5200_CS  10
#define SDCARD_CS 4

//Network settings
IPAddress ip(192,168,178,111);//If DHCP is disabled, specify an IP according to your network settings
byte mac[] = { 0x00, 0xAA, 0xBB, 0xCC, 0xDE, 0x02 };
char server[] = "opensensemap.org";
EthernetClient client;

String currentSensorId = TEMPERATURESENSOR_ID;
float temperature;
float humidity;
float pressure;
unsigned long  lux;
int analogNoise;
int uvValue;

DHT dht(DHTPIN, DHTTYPE);
Barometer barometer;

//Variables for time sync and upload intervall
const unsigned long postingInterval = 10*1000*60; //1 minute
unsigned long lastConnectionTime = 0;
boolean lastConnected = false;
boolean uploadSuccess = true;
String sensorSample;
int sampleType = 1; //1=temp,2=humi,3=baro,4=light

void setup(){
  Wire.begin();
  Serial.begin(9600);
  //Setup chip select and deselect the SD card
  pinMode(SDCARD_CS,OUTPUT);
  digitalWrite(SDCARD_CS,HIGH);
  delay(500);
  // start the Ethernet connection 
  if (Ethernet.begin(mac) == 0) {
    Serial.println("Failed to configure Ethernet using DHCP.");
    //If DHCP is disabled, use static IP
    Ethernet.begin(mac, ip);
  }else Serial.println("DHCP setup successful.");
  //Print the IP to serial port
  Serial.print("My IP address: ");
  for (byte thisByte = 0; thisByte < 4; thisByte++) {
    // print the value of each byte of the IP address:
    Serial.print(Ethernet.localIP()[thisByte], DEC);
    Serial.print("."); 
  }
  Serial.println();
  barometer.init();
  dht.begin();
  TSL2561.init();
}

void loop(){
  // if there's incoming data from the net connection.
  // send it out the serial port.  This is for debugging purposes only
  if (client.available()) {
    char c = client.read();
    Serial.print(c);
  }
  // if there's no net connection, but there was one last time
  // through the loop, then stop the client:
  if (!client.connected() && lastConnected) {
    Serial.println();
    Serial.println();
    Serial.println("...stopping client!");
    client.stop();
  }  
  //If last upload was successful, switch case to select the next sensor
  if (uploadSuccess){
    Serial.println();
    delay(1000);
    sensorSample = "";
    switch (sampleType)
    {
      case 1:
        //temperature = dht.readTemperature();
        temperature = barometer.bmp085GetTemperature(barometer.bmp085ReadUT());
        sensorSample = floatToString(temperature,0);
        currentSensorId = TEMPERATURESENSOR_ID;
        break;
      case 2:
        humidity = dht.readHumidity();
        sensorSample = floatToString(humidity,0);
        currentSensorId = HUMIDITYSENSOR_ID;//bmp085ReadUT MUST be called first
        break;
      case 3:
        pressure = barometer.bmp085GetTemperature(barometer.bmp085ReadUT());
        pressure = barometer.bmp085GetPressure(barometer.bmp085ReadUP());
        sensorSample = floatToString(pressure,0);
        currentSensorId = PRESSURESENSOR_ID;
        break;
      case 4:
        analogNoise = analogRead(NOISEPIN);
        sensorSample = (String)analogNoise;
        currentSensorId = NOISESENSOR_ID;
        break;
      case 5:
        TSL2561.getLux();
        lux = TSL2561.calculateLux(0,0,1);
        sensorSample = (String)lux;
        currentSensorId = LIGHTSENSOR_ID;
        break;
      case 6:
        uvValue = analogRead(UVPIN);
        sensorSample = (String)uvValue;
        currentSensorId = UVSENSOR_ID;
        break;
    }
  }
  // if you're not already connected, and 60 seconds have passed since
  // your last connection, then connect again and send data: 
  uploadSuccess = false;
  if(!client.connected() && (millis() - lastConnectionTime > postingInterval)) {
    Serial.println("-----------------------------------");
    Serial.print("Connecting and posting sensor sample (case ");
    Serial.print(sampleType);
    Serial.print(")...");
    Serial.println(); 
    postObservation(sensorSample, currentSensorId, SENSEBOX_ID);
  }
  // store the state of the connection for next time through the loop
  lastConnected = client.connected();
}

String floatToString(float number, int precision)
{
  String stringNumber = "";
  //int prec;
  //only temperature (case 1) has a decimal place
  //if (sampleType == 1) prec = 1; else prec = 0;
  char tempChar[10];
  dtostrf(number, 3, precision, tempChar);
  stringNumber += tempChar;
  return stringNumber;
}

int calcUVIndex(int analogValue){
  int uvi;
  if (analogValue<10) uvi = 0;
  else if (analogValue<46) uvi = 1;
  else if (analogValue<65) uvi = 2;
  else if (analogValue<83) uvi = 3;
  else if (analogValue<103) uvi = 4;
  else if (analogValue<124) uvi = 5;
  else if (analogValue<142) uvi = 6;
  else if (analogValue<162) uvi = 7;
  else if (analogValue<180) uvi = 8;
  else if (analogValue<200) uvi = 9;
  else if (analogValue<221) uvi = 10;
  else if (analogValue<240) uvi = 11;
  return uvi;
}

//Method for posting a measurement to OSM server
void postObservation(String measurement, String sensorId, String boxId)
{  
  //if (measurement=="") return;
  wdt_enable(WDTO_8S);
  //json must look like {"value":"12.5"} 
  String valueJson = "{\"value\":"; 
  valueJson += measurement; 
  valueJson += "}";
  Serial.println(valueJson);
  //post observation to: http://opensensemap.org:8000/boxes/boxId/sensorId
  // if you get a connection, report back via serial: 
  wdt_reset();
  if (client.connect(server, 8000)) 
  {
    Serial.print("connected..."); 
    Serial.println();
    // Make a HTTP Post request: 
    client.print("POST /boxes/"); 
    client.print(boxId);
    client.print("/"); 
    client.print(sensorId); 
    client.println(" HTTP/1.1"); 
    // Send the required header parameters 
    client.println("Host:opensensemap.org"); 
    client.println("Content-Type: application/json"); 
    client.println("Connection: close");  
    client.print("Content-Length: "); 
    client.println(valueJson.length()); 
    client.println(); 
    client.print(valueJson); 
    client.println(); 
    Serial.println("done!");
    uploadSuccess = true;
    //Change case
    if (sampleType == 5) {
      sampleType = 1;
      // remember the time that the connection was made or attempted
      lastConnectionTime = millis();
    }else sampleType++;
  }else 
  {
    // stop the client if you couldn't make a connection !
    Serial.println("failed...disconnecting.");
    client.stop();
  }
  wdt_disable();
}
