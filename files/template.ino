/*
SenseBox Citizen Sensingplatform
Version: 1.0
Date: 2014-05-11
Homepage: http://sensebox.uni-muenster.de/bestellen/fuer-buerger/
Author: Jan Wirwahn
*/

//libraries to include
#include <DHT.h>
#include <Barometer.h>
#include <Wire.h>
#include <SPI.h>
#include <EthernetV2_0.h>
 
//Ethernet shield settings
#define W5200_CS  10
#define SDCARD_CS 4

//Define analog ports used by sensors
#define NOISEPIN A0
#define LIGHTPIN A1
#define DHTPIN A2   

/* 
* USER SETUP 
* Provide your SenseBoxID and , if your network does not support DHCP, an IP address!
*/
//SenseBox ID

//If DHCP is not enabled, specify an IP according to your network settings:
IPAddress ip(192,168,178,111);

//Senor IDs

//Network settings
byte mac[] = { 0x00, 0xAA, 0xBB, 0xCC, 0xDE, 0x02 };
char server[] = "opensensemap.org";
EthernetClient client;

//Measurement variables
float temperature, pressure, humidity;
int analogLightValue, analogNoiseValue;
float lightResistance; //Resistance of light sensor in K
String sensorSample;
int sampleType = 1;
String currentSensorId;

//Sensor instances
Barometer barometer;
DHT dht(DHTPIN, DHT11);

//Variables for time sync and upload intervall
const unsigned long postingInterval = 10*1000; //10 seconds
unsigned long lastConnectionTime = 0;
boolean lastConnected = false;
boolean uploadSuccess = false;

void setup(){
  //Start serial port
  Serial.begin(9600);
  
  //Setup chip select and deselect the SD card
  pinMode(SDCARD_CS,OUTPUT);
  digitalWrite(SDCARD_CS,HIGH);
  
  // give the ethernet module time to boot up
  delay(1000);
  
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
  
  //initialize barometer and DHT sensors
  barometer.init();
  dht.begin();
}

void loop()
{
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
        temperature = barometer.bmp085GetTemperature(barometer.bmp085ReadUT());
        sensorSample = floatToString(temperature);
        currentSensorId = temperatureSensorId;
        break;
      case 2:
        //bmp085ReadUT MUST be called first
        temperature = barometer.bmp085GetTemperature(barometer.bmp085ReadUT());
        pressure = barometer.bmp085GetPressure(barometer.bmp085ReadUP());
        sensorSample = floatToString(pressure);
        currentSensorId = pressureSensorId;
        break;
      case 3:
        humidity = dht.readHumidity();
        sensorSample = floatToString(humidity);
        currentSensorId = humiditySensorId;
        break;
      case 4:
        analogLightValue = analogRead(LIGHTPIN);
        sensorSample = (String)analogLightValue;
        currentSensorId = lightSensorId;
        break;
      case 5:
        analogNoiseValue = analogRead(NOISEPIN);
        sensorSample = (String)analogNoiseValue;
        currentSensorId = noiseSensorId;
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
    postObservation(sensorSample, currentSensorId, senseboxId);
  }
  // store the state of the connection for next time through the loop
  lastConnected = client.connected();
}

//Method for posting a measurement to OSM server
void postObservation(String measurement, String sensorId, String boxId)
{  
  //json must look like {"value":"12.5"} 
  String valueJson = "{\"value\":"; 
  valueJson += measurement; 
  valueJson += "}";
  Serial.println(valueJson);
  //post observation to: http://opensensemap.org:8000/boxes/boxId/sensorId
  // if you get a connection, report back via serial: 
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
}

String floatToString(float number)
{
  String stringNumber = "";
  int prec;
  //only temperature (case 1) has a decimal place
  if (sampleType == 1) prec = 1; else prec = 0;
  char tempChar[10]; 
  dtostrf(number, 3, prec, tempChar);
  stringNumber += tempChar;
  
  return stringNumber;
}
