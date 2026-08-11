// ESP8266 WiFi connection test
// Connects to the WiFi network configured below and prints the assigned
// IP address and the module's MAC address to the Serial Monitor (9600 baud).

#include <ESP8266WiFi.h>

const char *ssid = "**********"; // ganti nama wifi  (replace with your WiFi name)
const char *pass = "**********"; // ganti password    (replace with your WiFi password)

WiFiClient client;

void setup() {
  Serial.begin(9600);
  delay(10);

  Serial.print(" Menghubungkan ke : ");
  Serial.println(ssid);

  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print("....");
  }
  Serial.print("\n");
  Serial.print("IP address : ");
  Serial.print(WiFi.localIP());
  Serial.print("\n");
  Serial.print("MAC : ");
  Serial.println(WiFi.macAddress());
  Serial.println("");
  Serial.print("Terhubung dengan : ");
  Serial.println(ssid);
}

void loop() { }
