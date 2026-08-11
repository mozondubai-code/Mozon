# ESP8266 (NodeMCU) WiFi Sketches

Arduino sketches for the ESP8266 / NodeMCU used to check WiFi around a
machine location and to test that the module can join a network.

## Sketches

### 1. `wifi-scan/`

Scans for nearby WiFi networks every 5 seconds — including hidden ones —
and prints them to the Serial Monitor:

```
3 networks found:
  00: [CH 06] [A4:2B:B0:D2:44:1F] -60dBm * V MyNetwork
  01: [CH 01] [3C:84:6A:11:02:9B] -72dBm   V CoffeeShop
  02: [CH 11] [C8:3A:35:FF:10:02] -85dBm * H
```

Columns: index, channel, BSSID (MAC of the access point), signal strength
(RSSI, closer to 0 is stronger), `*` = encrypted / blank = open,
`H` = hidden / `V` = visible, then the SSID.

Useful for surveying signal strength before installing a machine at a new
location.

### 2. `wifi-connect/`

Connection test. Edit the two lines at the top before uploading:

```cpp
const char *ssid = "**********"; // ganti nama wifi  (your WiFi name)
const char *pass = "**********"; // ganti password    (your WiFi password)
```

If the board connects successfully, the Serial Monitor shows the assigned
IP address, the module's MAC address, and the network name it joined.
If it stays stuck printing `....` forever, the SSID/password is wrong or
the signal is too weak.

> Do not commit real WiFi credentials — keep the `**********` placeholders
> in the repository and only fill them in locally before uploading.

## How to upload

1. Install the [Arduino IDE](https://www.arduino.cc/en/software) and add
   ESP8266 board support (Boards Manager URL:
   `http://arduino.esp8266.com/stable/package_esp8266com_index.json`).
2. Select your board (e.g. **NodeMCU 1.0 (ESP-12E Module)**) and its COM port.
3. Open the sketch folder, click **Upload**.
4. Open **Serial Monitor** at **9600 baud** to see the output.
