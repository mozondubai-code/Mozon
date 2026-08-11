// ESP8266 WiFi connection test (diagnostic version)
// Scans for the target network first, then tries to connect for 30 seconds.
// If it fails, it prints the actual reason (network not found, wrong
// password, ...) instead of printing dots forever, and retries.
// Serial Monitor: 9600 baud.

#include <ESP8266WiFi.h>

const char *ssid = "buhari";     // WiFi name — must match exactly (case-sensitive)
const char *pass = "**********"; // enter the buhari WiFi password here before uploading

const unsigned long CONNECT_TIMEOUT_MS = 30000;

// Report whether the target network is visible and how strong it is.
// Returns true if an exact SSID match was found.
bool scanForTarget() {
  Serial.println(F("Scanning for nearby networks..."));
  int n = WiFi.scanNetworks(/*async=*/false, /*hidden=*/true);

  if (n <= 0) {
    Serial.println(F("No networks found at all — check antenna/power."));
    return false;
  }

  bool found = false;
  for (int i = 0; i < n; i++) {
    bool match = (WiFi.SSID(i) == ssid);
    if (match) found = true;
    Serial.printf(PSTR("  %s[CH %02d] %ddBm %s\n"),
                  match ? "-> " : "   ",
                  WiFi.channel(i),
                  WiFi.RSSI(i),
                  WiFi.SSID(i).length() ? WiFi.SSID(i).c_str() : "(hidden)");
  }

  if (!found) {
    Serial.printf(PSTR("\n'%s' NOT found in the scan.\n"), ssid);
    Serial.println(F("  - Check the exact spelling/capitalization above."));
    Serial.println(F("  - ESP8266 only supports 2.4GHz. If the router is"));
    Serial.println(F("    5GHz-only, enable its 2.4GHz band."));
    Serial.println(F("  - Move the board closer to the router."));
  } else {
    Serial.printf(PSTR("\n'%s' found. Connecting"), ssid);
  }
  WiFi.scanDelete();
  return found;
}

void printStatusDiagnosis(wl_status_t st) {
  Serial.printf(PSTR("\nFailed after %lus. Status: %d — "),
                CONNECT_TIMEOUT_MS / 1000, st);
  switch (st) {
    case WL_NO_SSID_AVAIL:
      Serial.println(F("network not found (wrong name or 5GHz-only router)."));
      break;
    case WL_WRONG_PASSWORD:
      Serial.println(F("WRONG PASSWORD — fix `pass` at the top and re-upload."));
      break;
    case WL_CONNECT_FAILED:
      Serial.println(F("connection failed (password/security mismatch, or"
                       " router uses WPA3-only — enable WPA2 mode)."));
      break;
    case WL_IDLE_STATUS:
    case WL_DISCONNECTED:
      Serial.println(F("still negotiating — weak signal, MAC filtering, or"
                       " the router's DHCP did not answer. Retrying..."));
      break;
    default:
      Serial.println(F("unknown state. Retrying..."));
      break;
  }
}

bool tryConnect() {
  WiFi.begin(ssid, pass);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > CONNECT_TIMEOUT_MS) {
      printStatusDiagnosis(WiFi.status());
      WiFi.disconnect();
      return false;
    }
    delay(500);
    Serial.print(".");
  }
  return true;
}

void setup() {
  Serial.begin(9600);
  delay(10);
  Serial.println();

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  Serial.print(F("Target network : "));
  Serial.println(ssid);
  if (String(pass) == "**********") {
    Serial.println(F("WARNING: password is still the ********** placeholder!"));
    Serial.println(F("Edit `pass` at the top of the sketch and re-upload."));
  }

  while (true) {
    scanForTarget();
    if (tryConnect()) break;
    Serial.println(F("Retrying in 5 seconds...\n"));
    delay(5000);
  }

  Serial.print(F("\nIP address : "));
  Serial.println(WiFi.localIP());
  Serial.print(F("MAC : "));
  Serial.println(WiFi.macAddress());
  Serial.print(F("Signal : "));
  Serial.print(WiFi.RSSI());
  Serial.println(F(" dBm"));
  Serial.print(F("Terhubung dengan : "));
  Serial.println(ssid);
}

void loop() { }
