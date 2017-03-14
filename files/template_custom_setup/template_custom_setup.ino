#include <SPI.h>
#include <Ethernet.h>
/*
   Zusätzliche Sensorbibliotheken, -Variablen etc im Folgenden einfügen.
*/

//senseBox ID

//Sensor IDs

//Ethernet-Parameter
char server[] = "@@OSEM_POST_DOMAIN@@";
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
// Diese IP Adresse nutzen falls DHCP nicht möglich
IPAddress myIP(192, 168, 0, 42);
EthernetClient client;

//Messparameter
const unsigned int postingInterval = 60000; //Uploadintervall in Millisekunden

void setup () {
  Serial.begin(9600);
  Serial.print("Starting network...");
  //Ethernet Verbindung mit DHCP ausführen..
  if (Ethernet.begin(mac) == 0)
  {
    Serial.println("DHCP failed!");
    //Falls DHCP fehltschlägt, mit manueller IP versuchen
    Ethernet.begin(mac, myIP);
  }
  Serial.println("done!");
  delay(1000);
  Serial.println("Starting loop.");
}

void loop () {
  /*
     Hier Sensoren auslesen und nacheinerander über postFloatValue(...) hochladen. Beispiel:

     float temperature = sensor.readTemperature();
     postFloatValue(temperature, 1, temperatureSensorID);
  */
  sleep(postingInterval);
}

void postFloatValue (float measurement, int digits, String sensorId) {
  //Float zu String konvertieren
  char obs[10];
  dtostrf(measurement, 5, digits, obs);
  //Json erstellen
  String jsonValue = "{\"value\":";
  jsonValue += obs;
  jsonValue += "}";
  //Mit OSeM Server verbinden und POST Operation durchführen
  Serial.println("-------------------------------------");
  Serial.print("Connectingto OSeM Server...");
  if (client.connect(server, 80)) {
    Serial.println("connected!");
    Serial.println("-------------------------------------");
    //HTTP Header aufbauen
    client.print("POST /boxes/"); client.print(SENSEBOX_ID); client.print("/"); client.print(sensorId); client.println(" HTTP/1.1");
    client.print("Host:");
    client.println(server);
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.print("Content-Length: "); client.println(jsonValue.length());
    client.println();
    //Daten senden
    client.println(jsonValue);
  } else {
    Serial.println("failed!");
    Serial.println("-------------------------------------");
  }
  //Antwort von Server im seriellen Monitor anzeigen
  waitForServerResponse();
}

void waitForServerResponse () {
  //Ankommende Bytes ausgeben
  boolean repeat = true;
  do {
    if (client.available()) {
      char c = client.read();
      Serial.print(c);
    }
    //Verbindung beenden
    if (!client.connected()) {
      Serial.println();
      Serial.println("--------------");
      Serial.println("Disconnecting.");
      Serial.println("--------------");
      client.stop();
      repeat = false;
    }
  } while (repeat);
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
