#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include <time.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <MD_Parola.h>
#include <MD_MAX72XX.h>

// WiFi credentials
const char* ssid = "Airtel_hone_1605";
const char* password = "air87073";

// Firebase Realtime Database URL
const char* firebaseHost = "https://bike-stand-14fdb-default-rtdb.firebaseio.com";

// RFID Pins
#define RST_PIN         4   // RC522 RST
#define SS_PIN          5   // RC522 SDA/SS

// LED Ring
#define LED_PIN         25  // WS2812 DIN
#define NUM_LEDS        16

// Buzzer
#define BUZZER_PIN      15  // Active Buzzer GPIO15

// MAX7219 LED Matrix Pins
#define HARDWARE_TYPE   MD_MAX72XX::FC16_HW
#define MAX_DEVICES     8   // 2 modules connected as chain
#define DATA_PIN        27  // Data In (GPIO 25)
#define CLK_PIN         32  // Clock (GPIO 32)
#define CS_PIN          33  // Chip Select (GPIO 33)

MFRC522 rfid(SS_PIN, RST_PIN);
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
MD_Parola display = MD_Parola(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// Web server for manual WiFi configuration
WebServer server(80);
DNSServer dnsServer;
const byte DNS_PORT = 53;

// WiFi configuration variables
bool wifiConfigured = false;
String manualSSID = "";
String manualPassword = "";

// HTML page for WiFi configuration
const char* wifiConfigHTML = R"html(
<!DOCTYPE html>
<html>
<head>
    <title>WiFi Configuration</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 500px; margin: 0 auto; }
        input[type=text], input[type=password] { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { background-color: #4CAF50; color: white; padding: 14px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; margin: 5px 0; }
        button:hover { background-color: #45a049; }
        .scan-btn { background-color: #2196F3; }
        .scan-btn:hover { background-color: #1976D2; }
        .status { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .success { background-color: #dff0d8; color: #3c763d; border: 1px solid #d6e9c6; }
        .error { background-color: #f2dede; color: #a94442; border: 1px solid #ebccd1; }
        .network-list { margin: 20px 0; }
        .network-item { 
            padding: 10px; 
            margin: 5px 0; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            cursor: pointer; 
            background-color: #f9f9f9;
        }
        .network-item:hover { background-color: #e9e9e9; }
        .network-item.selected { 
            background-color: #e3f2fd; 
            border-color: #2196F3; 
        }
        .network-name { font-weight: bold; }
        .network-details { font-size: 12px; color: #666; }
        .loading { text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>ESP32 WiFi Configuration</h2>
        
        <button class="scan-btn" onclick="scanNetworks()">🔍 Scan for WiFi Networks</button>
        
        <div id="networks" class="network-list"></div>
        
        <form method="post" action="/connect" id="wifiForm">
            <label for="ssid">WiFi SSID:</label>
            <input type="text" id="ssid" name="ssid" required readonly>
            
            <label for="password">WiFi Password:</label>
            <input type="password" id="password" name="password" required>
            
            <button type="submit">Connect to WiFi</button>
        </form>
        
        <div id="status"></div>
        
        <script>
            let selectedNetwork = null;
            
            function scanNetworks() {
                const networksDiv = document.getElementById('networks');
                networksDiv.innerHTML = '<div class="loading">Scanning for networks...</div>';
                
                fetch('/scan')
                    .then(response => response.json())
                    .then(networks => {
                        if (networks.length === 0) {
                            networksDiv.innerHTML = '<div class="loading">No networks found</div>';
                            return;
                        }
                        
                        let html = '<h3>Available Networks:</h3>';
                        networks.forEach(network => {
                            const signalStrength = getSignalStrength(network.rssi);
                            html += `
                                <div class="network-item" onclick="selectNetwork('${network.ssid}', '${network.encryption}')">
                                    <div class="network-name">${network.ssid}</div>
                                    <div class="network-details">
                                        ${signalStrength} • ${network.encryption} • RSSI: ${network.rssi}dBm
                                    </div>
                                </div>
                            `;
                        });
                        networksDiv.innerHTML = html;
                    })
                    .catch(error => {
                        networksDiv.innerHTML = '<div class="error">Error scanning networks</div>';
                    });
            }
            
            function selectNetwork(ssid, encryption) {
                // Remove previous selection
                document.querySelectorAll('.network-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Add selection to clicked item
                event.target.closest('.network-item').classList.add('selected');
                
                // Fill the SSID field
                document.getElementById('ssid').value = ssid;
                selectedNetwork = ssid;
                
                // Focus on password field
                document.getElementById('password').focus();
            }
            
            function getSignalStrength(rssi) {
                if (rssi >= -50) return '📶 Excellent';
                if (rssi >= -60) return '📶 Good';
                if (rssi >= -70) return '📶 Fair';
                return '📶 Poor';
            }
            
            // Check connection status
            function checkStatus() {
                fetch('/status')
                    .then(response => response.json())
                    .then(data => {
                        const statusDiv = document.getElementById('status');
                        if (data.connected) {
                            statusDiv.innerHTML = '<div class="status success">✅ Connected to: ' + data.ssid + '</div>';
                        } else {
                            statusDiv.innerHTML = '<div class="status error">❌ Not connected to WiFi</div>';
                        }
                    });
            }
            
            // Auto-scan on page load
            window.onload = function() {
                scanNetworks();
                checkStatus();
            };
            
            // Check status every 2 seconds
            setInterval(checkStatus, 2000);
        </script>
    </div>
</body>
</html>
)html";

// LED and Buzzer feedback functions
void showError() {
  // Red LED and long beep (3 seconds)
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(255, 0, 0)); // Red
  }
  strip.show();
  
  digitalWrite(BUZZER_PIN, HIGH);
  delay(3000); // 3 second long beep
  digitalWrite(BUZZER_PIN, LOW);
  
  delay(1000);
  strip.clear();
  strip.show();
}

void showSuccess() {
  // Green LED and single beep
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(0, 255, 0)); // Green
  }
  strip.show();
  
  digitalWrite(BUZZER_PIN, HIGH);
  delay(500); // Single beep
  digitalWrite(BUZZER_PIN, LOW);
  
  delay(1000);
  strip.clear();
  strip.show();
}

void showExit() {
  // Purple LED and double beep
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(0, 0, 255)); // Blue
  }
  strip.show();
  
  // Double beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  delay(200);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  
  delay(1000);
  strip.clear();
  strip.show();
}

// Global variables for display management
unsigned long displayStartTime = 0;
unsigned long displayDuration = 3000; // 3 seconds
bool displayActive = false;
bool systemReady = false; // Track if system is in ready state

// MAX7219 LED Matrix Display Functions
void clearDisplay() {
  // Don't clear if system is in ready state
  if (systemReady) {
    return; // Keep showing "Ready..." message
  }
  
  display.displayClear();
  displayActive = false;
}

void setIntensity(int intensity) {
  display.setIntensity(intensity);
}

void displayText(const char* text) {
  // Force stop any running animations first
  display.displayReset();
  
  // Clear any previous display operations
  display.displayClear();
  
  display.setTextAlignment(PA_CENTER);
  
  // Set smaller font size for better fit
  display.setFont(0); // Use smallest font (0 = smallest, 1 = medium, 2 = large)
  
  // Immediately show the text so it's visible right away
  display.print(text);
  
  // Set display timer for longer duration so text stays visible
  displayStartTime = millis();
  displayDuration = 10000; // 10 seconds - enough time for operations to complete
  displayActive = true;
  
  // Force stop animations to prevent interference
  display.displayReset();
  
  // Text is now visible and will stay visible while code continues processing
}

void displayStat(const char* text) {
  // Force stop any running animations first
  display.displayReset();
  
  // Clear any previous display operations
  display.displayClear();
  
  display.setTextAlignment(PA_CENTER);
  
  // Set smaller font size for better fit
  display.setFont(0); // Use smallest font (0 = smallest, 1 = medium, 2 = large)
  
  // Immediately show the text so it's visible right away
  display.print(text);
  
  // Set display timer for longer duration so text stays visible
  displayStartTime = millis();
  displayDuration = 2000; // 10 seconds - enough time for operations to complete
  displayActive = true;
  
  // Force stop animations to prevent interference
  display.displayReset();
  
  // Text is now visible and will stay visible while code continues processing
}

void updateDisplay() {
  // Don't clear display if system is in ready state
  if (systemReady) {
    return; // Keep showing "Ready..." message indefinitely
  }
  
  // Check if display should be cleared (only for non-ready messages)
  if (displayActive && (millis() - displayStartTime) >= displayDuration) {
    // Clear the display and stop animations before showing ready message
    display.displayReset();
    clearDisplay();
    
    // Small delay to ensure clean transition
    delay(100);
    
    // Now show ready message
    showReadyMessage();
  }
}

void showConnecting() {
  displayText("CONNECTING");
}

void showReadyMessage() {
  // Only show if not already showing ready message
  if (systemReady) {
    return;
  }
  
  // Force stop any running animations and clear display
  display.displayReset();
  display.displayClear();
  
  // Wait to ensure clean state
  delay(200);
  
  // Reset display completely
  display.displayReset();
  
  // Set text properties BEFORE showing text
  display.setTextAlignment(PA_CENTER);
  display.setFont(0); // Use smallest font
  
  // Clear display one final time
  display.displayClear();
  
  // Show "Ready..." text
  display.print("Ready...");
  
  // Force the display to update and stop any animations
  display.displayReset();
  
  // Set system to ready state - this message stays until card is scanned
  systemReady = true;
  displayActive = false; // Don't use timer for ready message
  
  // Ensure display is not cleared by other functions
  displayStartTime = 0;
  displayDuration = 0;
}

// Web server functions
void handleRoot() {
  server.send(200, "text/html", wifiConfigHTML);
}

void handleScan() {
  // Scan for available WiFi networks
  int n = WiFi.scanNetworks();
  
  String json = "[";
  for (int i = 0; i < n; ++i) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"encryption\":\"" + getEncryptionType(WiFi.encryptionType(i)) + "\"";
    json += "}";
  }
  json += "]";
  
  server.send(200, "application/json", json);
}

String getEncryptionType(wifi_auth_mode_t encryptionType) {
  switch (encryptionType) {
    case WIFI_AUTH_OPEN:
      return "Open";
    case WIFI_AUTH_WEP:
      return "WEP";
    case WIFI_AUTH_WPA_PSK:
      return "WPA-PSK";
    case WIFI_AUTH_WPA2_PSK:
      return "WPA2-PSK";
    case WIFI_AUTH_WPA_WPA2_PSK:
      return "WPA/WPA2-PSK";
    case WIFI_AUTH_WPA2_ENTERPRISE:
      return "WPA2-Enterprise";
    default:
      return "Unknown";
  }
}

void handleConnect() {
  if (server.hasArg("ssid") && server.hasArg("password")) {
    manualSSID = server.arg("ssid");
    manualPassword = server.arg("password");
    
    // Try to connect to the provided WiFi
    WiFi.begin(manualSSID.c_str(), manualPassword.c_str());
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      wifiConfigured = true;
      server.send(200, "text/plain", "Connected to " + manualSSID);
    } else {
      server.send(400, "text/plain", "Failed to connect to " + manualSSID);
    }
  } else {
    server.send(400, "text/plain", "Missing SSID or password");
  }
}

void handleStatus() {
  String status = "{\"connected\":";
  if (WiFi.status() == WL_CONNECTED) {
    status += "true,\"ssid\":\"" + WiFi.SSID() + "\"}";
  } else {
    status += "false,\"ssid\":\"\"}";
  }
  server.send(200, "application/json", status);
}

void setupAccessPoint() {
  // Create access point for WiFi configuration
  WiFi.mode(WIFI_AP);
  WiFi.softAP("ESP32_Config", "12345678");
  
  // Start DNS server
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  
  // Start web server
  server.on("/", handleRoot);
  server.on("/scan", handleScan);
  server.on("/connect", HTTP_POST, handleConnect);
  server.on("/status", handleStatus);
  server.begin();
  
  // Show AP mode with LED indication
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(255, 165, 0)); // Orange
  }
  strip.show();
  
  // Serial.println("Access Point started");
  // Serial.println("SSID: ESP32_Config");
  // Serial.println("Password: 12345678");
  // Serial.println("IP: " + WiFi.softAPIP().toString());
}

void setup() {
   Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  
  // Initialize LED strip

  strip.begin();
  strip.setBrightness(50);
  strip.clear();
  strip.show();

  //display.addChar('$', tickChar);
  
  // Initialize buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Initialize MAX7219 LED Matrix
  display.begin();
  display.setIntensity(8); // Set brightness (0-15)
  display.displayClear();
  
  // Show "Connecting" on display
  showConnecting();
  
  // Try to connect to default WiFi first
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    // Show "Connecting" text during WiFi connection attempt
    showConnecting();
    
    // Blink LED during WiFi connection attempt
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(0, 0, 255)); // Blue
    }
    strip.show();
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    
    delay(300);
    strip.clear();
    strip.show();
    delay(300);
    
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    // Default WiFi connected successfully
    wifiConfigured = true;
    clearDisplay(); // Clear display when connected
    // Serial.println("Connected to default WiFi: " + String(ssid));
  } else {
    // Default WiFi failed, start access point for manual configuration
    // Serial.println("Default WiFi connection failed. Starting access point for manual configuration.");
    setupAccessPoint();
    
    // Wait for manual WiFi configuration
    while (!wifiConfigured) {
      dnsServer.processNextRequest();
      server.handleClient();
      delay(10);
    }
    
    // Stop access point and DNS server
    WiFi.softAPdisconnect(true);
    dnsServer.stop();
    server.close();
  }
  
  // NTP time sync for IST (UTC+5:30)
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov"); // 19800 seconds = 5 hours 30 minutes
  // Serial.print("Waiting for NTP time sync...");
  time_t now = time(nullptr);
  while (now < 8 * 3600 * 2) {
    // Show "Connecting" during NTP sync
    showConnecting();
    
    // Blink LED during NTP sync
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(0, 0, 255)); // Blue
    }
    strip.show();
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    
    delay(300);
    strip.clear();
    strip.show();
    delay(300);
    
    // Serial.print(".");
    now = time(nullptr);
  }
  // Serial.println("\nTime synchronized!");

  // Clear LED and stop buzzer when ready
  strip.clear();
  strip.show();
  digitalWrite(BUZZER_PIN, LOW);
  
  // Ensure display is completely clear before showing ready message
  clearDisplay();
  delay(200); // Give display time to clear completely
  
  // Show "Ready..." message when system is ready to read cards
  showReadyMessage();

  // Serial.println("Ready for RFID scanning...");
}

void loop() {
  // Update the display
  updateDisplay();

  // Keep display animation running ONLY when not showing ready message
  if (!systemReady && display.displayAnimate()) {
    display.displayReset();
  }

  // Check if RFID card is present
  if (!rfid.PICC_IsNewCardPresent()) {
    delay(100);
    
    // Show "Ready..." message when no card is present and no other operations are active
    if (!displayActive && !systemReady) {
      showReadyMessage();
    }
    
    return;
  }

  // Card detected - clear ready state and prepare for processing
  if (systemReady) {
    systemReady = false; // No longer in ready state
    clearDisplay(); // Clear the "Ready..." message
  }

  // Check if WiFi is still connected, if not try to reconnect
  if (WiFi.status() != WL_CONNECTED) {
    // Serial.println("WiFi disconnected! Attempting to reconnect...");
    
    // Show "Connecting" during reconnection
    showConnecting();
    
    // Try to reconnect to the last known WiFi
    if (wifiConfigured && manualSSID != "") {
      WiFi.begin(manualSSID.c_str(), manualPassword.c_str());
    } else {
      WiFi.begin(ssid, password);
    }
    
    int reconnectAttempts = 0;
    while (WiFi.status() != WL_CONNECTED && reconnectAttempts < 30) {
      // Show "Connecting" text during reconnection
      showConnecting();
      
      // Update display
      updateDisplay();
      
      // Keep display animation running
      if (display.displayAnimate()) {
        display.displayReset();
      }
      
      // Blink LED during reconnection
      for (int i = 0; i < NUM_LEDS; i++) {
        strip.setPixelColor(i, strip.Color(255, 0, 0)); // Red
      }
      strip.show();
      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);
      digitalWrite(BUZZER_PIN, LOW);
      
      delay(300);
      strip.clear();
      strip.show();
      delay(300);
      
      reconnectAttempts++;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
      // Serial.println("Reconnection failed! Starting access point for manual configuration.");
      setupAccessPoint();
      
      // Wait for manual WiFi configuration
      while (!wifiConfigured) {
        dnsServer.processNextRequest();
        server.handleClient();
        delay(10);
      }
      
      // Stop access point and DNS server
      WiFi.softAPdisconnect(true);
      dnsServer.stop();
      server.close();
    } else {
      clearDisplay(); // Clear display when reconnected
    }
  }

  if (!rfid.PICC_ReadCardSerial()) {
    delay(100);
    return;
  }

  // Build UID string
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) cardId += "0";
    cardId += String(rfid.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();
  // Serial.print("Card UID: ");
  // Serial.println(cardId);

  // Search for monthly pass by cardId
  String monthlyUrl = String(firebaseHost) + "/SaidapetStand/monthlyPass.json?orderBy=\"cardId\"&equalTo=\"" + cardId + "\"";
  // Serial.println("Searching monthly pass: " + monthlyUrl);

  HTTPClient http;
  http.begin(monthlyUrl);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    // Serial.println("Monthly pass response: " + payload);

    DynamicJsonDocument doc(2048);
    deserializeJson(doc, payload);
    http.end();

    // Check if monthly pass found
    if (doc.size() > 0) {
       Serial.println("✅ Card found in MONTHLY PASS database");
      
              for (JsonPair kv : doc.as<JsonObject>()) {
          String passId = kv.key().c_str();
          // Serial.println("Found pass ID: " + passId);

          // Ensure WiFi is connected
          if (WiFi.status() != WL_CONNECTED) {
            // Serial.println("WiFi disconnected! Reconnecting...");
            WiFi.reconnect();
            delay(2000);
            if (WiFi.status() != WL_CONNECTED) {
              // Serial.println("Reconnection failed!");
              return;
            }
          }

          HTTPClient httpClient;
          httpClient.setTimeout(10000); // Increase timeout to 10 seconds

          // Single GET request to fetch complete pass data
          String passDataUrl = String(firebaseHost) + "/SaidapetStand/monthlyPass/" + passId + ".json";
          // Serial.println("Fetching complete pass data at: " + passDataUrl);
          
          httpClient.begin(passDataUrl);
          int passDataCode = httpClient.GET();
          
          if (passDataCode == 200) {
            String passDataPayload = httpClient.getString();
            // Serial.println("Complete pass data: " + passDataPayload);
            
            DynamicJsonDocument passDoc(4096); // Increased size for complete pass data
            deserializeJson(passDoc, passDataPayload);
            
            // Extract current data
            String currentParkingStatus = passDoc["parkingStatus"].as<String>();
            String lastEntryTime = passDoc["lastEntryTime"].as<String>();
            String lastExitTime = passDoc["lastExitTime"].as<String>();
            String bikeNumber = passDoc["bikeNumber"].as<String>(); // Fetch bike number
            String validUntil = passDoc["validUntil"].as<String>(); // Fetch valid until date
            
            // IMMEDIATELY display bike number so user sees it right away
            if (bikeNumber.length() > 0) {
              displayText(bikeNumber.c_str());
            }
            
            // Check if monthly pass is expired
            if (validUntil.length() > 0) {
              // Parse the validUntil date (format: "2025-09-09T05:56:40.887Z")
              int validYear, validMonth, validDay, validHour, validMinute, validSecond;
              sscanf(validUntil.c_str(), "%d-%d-%dT%d:%d:%d", &validYear, &validMonth, &validDay, &validHour, &validMinute, &validSecond);
              
              // Get current time
              time_t now = time(nullptr);
              struct tm timeinfo;
              gmtime_r(&now, &timeinfo);
              
              // Compare dates
              if (timeinfo.tm_year + 1900 > validYear || 
                  (timeinfo.tm_year + 1900 == validYear && timeinfo.tm_mon + 1 > validMonth) ||
                  (timeinfo.tm_year + 1900 == validYear && timeinfo.tm_mon + 1 == validMonth && timeinfo.tm_mday > validDay)) {
                
                // Pass is expired
                String errorMessage = "EXPIRED";
                displayText(errorMessage.c_str());
                showError(); // Red LED and long beep for expired pass
                return; // Stop processing
              }
            }
            
            // Get current time
            time_t now = time(nullptr);
            struct tm timeinfo;
            // Use UTC time to match mobile app
            gmtime_r(&now, &timeinfo);
            char currentTime[30];
            snprintf(currentTime, sizeof(currentTime), "%04d-%02d-%02dT%02d:%02d:%02d.000Z",
                     timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                     timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
            char dateString[11];
            snprintf(dateString, sizeof(dateString), "%04d-%02d-%02d",
                     timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday);
            
            // Handle entry/exit logic
            if (currentParkingStatus == "\"Exited\"" || currentParkingStatus == "Exited") {
              // ENTRY PROCESS - Single PUT request
              // Serial.println("Processing entry for monthly pass");
              
              // Update pass data for entry
              passDoc["parkingStatus"] = "Parked";
              passDoc["lastEntryTime"] = String(currentTime);
              
              // Add new entry to Entries
              if (!passDoc.containsKey("Entries")) {
                passDoc.createNestedObject("Entries");
              }
              if (!passDoc["Entries"].containsKey(dateString)) {
                passDoc["Entries"].createNestedObject(dateString);
              }
              
              // Calculate next index
              int nextIndex = 0;
              Serial.println("🔍 Calculating next index for date: " + String(dateString));
              
              if (passDoc["Entries"][dateString].is<JsonArray>()) {
                // Handle JSON array format
                JsonArray entriesArray = passDoc["Entries"][dateString].as<JsonArray>();
                nextIndex = entriesArray.size();
                Serial.println("  Found JSON array with " + String(entriesArray.size()) + " entries");
                Serial.println("  Next index will be: " + String(nextIndex));
              } else if (passDoc["Entries"][dateString].is<JsonObject>()) {
                // Handle JSON object format
                for (JsonPair kv : passDoc["Entries"][dateString].as<JsonObject>()) {
                  int index = String(kv.key().c_str()).toInt();
                  Serial.println("  Found index: " + String(index));
                  if (index >= nextIndex) {
                    nextIndex = index + 1;
                  }
                }
                Serial.println("  Next index will be: " + String(nextIndex));
              } else {
                Serial.println("  No existing entries, starting with index 0");
              }
              
              // Create new entry
              Serial.println("📝 Creating new entry at index: " + String(nextIndex));
              
              if (passDoc["Entries"][dateString].is<JsonArray>()) {
                // Handle JSON array format
                JsonArray entriesArray = passDoc["Entries"][dateString].as<JsonArray>();
                JsonObject newEntry = entriesArray.createNestedObject();
                newEntry["entryTime"] = String(currentTime);
                newEntry["exitTime"] = "null";
                Serial.println("✅ Entry added to JSON array");
              } else {
                // Handle JSON object format
                JsonObject newEntry = passDoc["Entries"][dateString].createNestedObject(String(nextIndex));
                newEntry["entryTime"] = String(currentTime);
                newEntry["exitTime"] = "null";
                Serial.println("✅ Entry added to JSON object");
              }
              
              // Single PUT request to update entire pass
              String updateUrl = String(firebaseHost) + "/SaidapetStand/monthlyPass/" + passId + ".json";
              // Serial.println("Updating pass data for entry at: " + updateUrl);
              
              httpClient.end();
              httpClient.begin(updateUrl);
              httpClient.addHeader("Content-Type", "application/json");
              
              String updatedPayload;
              serializeJson(passDoc, updatedPayload);
              // Serial.println("Updated payload: " + updatedPayload);
              
              int updateCode = httpClient.PUT(updatedPayload);
              // Serial.println("Entry update code: " + String(updateCode));
              
              if (updateCode == 200) {
                // Serial.println("✅ Monthly pass entry processed successfully!");
                
                // Audio feedback first (beep sound)
                showSuccess(); // Green LED and single beep for successful entry
                
                // Display success message
                displayStat("ENTRY");
                
                // Bike number already displayed at the beginning - no need to show again
              } else {
                // Serial.println("❌ Error processing entry: " + httpClient.errorToString(updateCode));
                String errorMessage = "Network Error";
                displayText(errorMessage.c_str());
                showError(); // Red LED and long beep for entry error
              }
              
            } else if (currentParkingStatus == "\"Parked\"" || currentParkingStatus == "Parked") {
              // EXIT PROCESS - Single PUT request
              Serial.println("🔄 Processing exit for monthly pass");
              
              // Update pass data for exit
              passDoc["parkingStatus"] = "Exited";
              passDoc["lastExitTime"] = String(currentTime);
              Serial.println("📝 Updated parkingStatus to 'Exited'");
              Serial.println("📝 Updated lastExitTime to: " + String(currentTime));

              
              
              // Extract date from lastEntryTime to find the correct entry
              String lastEntryTime = passDoc["lastEntryTime"].as<String>();
              char entryDateString[11];
              Serial.println("📅 Original lastEntryTime: " + lastEntryTime);
              
              // Declare variables for date parsing
              int entryYear, entryMonth, entryDay;
              
              // Remove quotes if present and extract date part
              lastEntryTime.replace("\"", "");
              int tIndex = lastEntryTime.indexOf('T');
              if (tIndex > 0) {
                lastEntryTime = lastEntryTime.substring(0, tIndex);
              }
              Serial.println("📅 Cleaned lastEntryTime: " + lastEntryTime);
              
              // Parse the date (format: YYYY-MM-DD)
              sscanf(lastEntryTime.c_str(), "%d-%d-%d", &entryYear, &entryMonth, &entryDay);
              snprintf(entryDateString, sizeof(entryDateString), "%04d-%02d-%02d", entryYear, entryMonth, entryDay);
              Serial.println("📅 Parsed entryDateString: " + String(entryDateString));
              
              // Find and update the last entry with exitTime using the entry date
              Serial.println("🔍 Checking if Entries node exists for date: " + String(entryDateString));
              if (passDoc.containsKey("Entries") && passDoc["Entries"].containsKey(entryDateString)) {
                Serial.println("✅ Entries node found for date: " + String(entryDateString));
                JsonObject entriesForDate = passDoc["Entries"][entryDateString];
                int lastIndex = -1;
                
                // Find the highest index
                Serial.println("🔍 Finding highest index in entries...");
                // Try to iterate as object first (most common case)
                bool hasKeys = false;
                for (JsonPair kv : entriesForDate) {
                  hasKeys = true;
                  int index = String(kv.key().c_str()).toInt();
                  Serial.println("  Found index: " + String(index));
                  if (index > lastIndex) {
                    lastIndex = index;
                  }
                }
                
                if (!hasKeys) {
                  // If no keys found, it might be an array or empty
                  Serial.println("  No keys found, checking if it's an array...");
                  // For array format, we need to access it differently
                  // Since entriesForDate is already a JsonObject, we need to check the parent
                  if (passDoc["Entries"][entryDateString].is<JsonArray>()) {
                    JsonArray entriesArray = passDoc["Entries"][entryDateString].as<JsonArray>();
                    lastIndex = entriesArray.size() - 1;
                    Serial.println("  Found JSON array with " + String(entriesArray.size()) + " entries");
                    Serial.println("  Using last index: " + String(lastIndex));
                  }
                }
                Serial.println("📊 Highest index found: " + String(lastIndex));
                
                // Update the last entry with exit time
                if (lastIndex >= 0) {
                  Serial.println("✅ Updating entry at index: " + String(lastIndex));
                  // Check if it's an array format by trying to access the parent
                  if (passDoc["Entries"][entryDateString].is<JsonArray>()) {
                    // Handle JSON array format
                    JsonArray entriesArray = passDoc["Entries"][entryDateString].as<JsonArray>();
                    JsonObject lastEntry = entriesArray[lastIndex];
                    lastEntry["exitTime"] = String(currentTime);
                    Serial.println("📝 Updated exitTime to: " + String(currentTime));
                  } else {
                    // Handle JSON object format
                    JsonObject lastEntry = entriesForDate[String(lastIndex)];
                    lastEntry["exitTime"] = String(currentTime);
                    Serial.println("📝 Updated exitTime to: " + String(currentTime));
                  }
                } else {
                  Serial.println("❌ No valid index found to update");
                }
              } else {
                Serial.println("❌ Entries node not found for date: " + String(entryDateString));
                Serial.println("🔍 Available dates in Entries:");
                if (passDoc.containsKey("Entries")) {
                  for (JsonPair kv : passDoc["Entries"].as<JsonObject>()) {
                    Serial.println("  - " + String(kv.key().c_str()));
                  }
                } else {
                  Serial.println("  - No Entries node exists");
                }
              }
              
              // Single PUT request to update entire pass
              String updateUrl = String(firebaseHost) + "/SaidapetStand/monthlyPass/" + passId + ".json";
              Serial.println("🌐 Updating pass data for exit at: " + updateUrl);
              
              httpClient.end();
              httpClient.begin(updateUrl);
              httpClient.addHeader("Content-Type", "application/json");
              
              String updatedPayload;
              serializeJson(passDoc, updatedPayload);
              Serial.println("📦 Updated payload length: " + String(updatedPayload.length()));
              Serial.println("📦 Payload preview: " + updatedPayload.substring(0, min(200, (int)updatedPayload.length())));
              
              int updateCode = httpClient.PUT(updatedPayload);
              Serial.println("📡 Exit update HTTP code: " + String(updateCode));
              
              if (updateCode == 200) {
                Serial.println("✅ Monthly pass exit processed successfully!");
                
                // Audio feedback first (beep sound)
                showExit(); // Purple LED and double beep for successful exit
                
                // Display exit success message
                displayStat("EXIT");
                
                // Bike number already displayed at the beginning - no need to show again
              } else {
                Serial.println("❌ Error processing exit: " + httpClient.errorToString(updateCode));
                Serial.println("❌ HTTP Error: " + String(updateCode));
                showError(); // Red LED and long beep for exit error
              }
            } else {
              Serial.println("❌ Unknown parking status: " + currentParkingStatus);
              showError(); // Red LED and long beep for unknown status
            }
            
            httpClient.end();
          } else {
            // Serial.println("Failed to fetch pass data. HTTP code: " + String(passDataCode));
            showError(); // Red LED and long beep for fetch error
          }
        }
  } else {
    // Serial.println("❌ Card not found in MONTHLY PASS database");
    http.end();
    

    
    // Search for prepaid pass by cardId
    // Serial.println("🔍 Searching prepaid pass database...");
    String prepaidUrl = String(firebaseHost) + "/SaidapetStand/prepaidPass.json?orderBy=\"cardId\"&equalTo=\"" + cardId + "\"";
    // Serial.println("Searching prepaid pass: " + prepaidUrl);

    HTTPClient prepaidHttp;
    prepaidHttp.begin(prepaidUrl);
    int prepaidHttpCode = prepaidHttp.GET();

    if (prepaidHttpCode == 200) {
      String prepaidPayload = prepaidHttp.getString();
      // Serial.println("Prepaid pass response: " + prepaidPayload);

      DynamicJsonDocument prepaidDoc(2048);
      deserializeJson(prepaidDoc, prepaidPayload);
      prepaidHttp.end();

      // Check if prepaid pass found
      if (prepaidDoc.size() > 0) {
        // Serial.println("✅ Card found in PREPAID PASS database");
        
        for (JsonPair kv : prepaidDoc.as<JsonObject>()) {
          String prepaidPassId = kv.key().c_str();
          // Serial.println("Found prepaid pass ID: " + prepaidPassId);
          
          // Implement prepaid pass logic
          // Serial.println("🔄 Implementing prepaid pass logic...");
          
          // Single GET request to fetch complete prepaid pass data
          String prepaidPassDataUrl = String(firebaseHost) + "/SaidapetStand/prepaidPass/" + prepaidPassId + ".json";
          // Serial.println("Fetching prepaid pass data at: " + prepaidPassDataUrl);
          
          // Use the same httpClient with proper resource management
          http.end(); // Clean up before new request
          delay(500); // Small delay for resource cleanup
          
          http.begin(prepaidPassDataUrl);
          int prepaidDataCode = http.GET();
          
          if (prepaidDataCode == 200) {
            String prepaidDataPayload = http.getString();
            // Serial.println("Prepaid pass data: " + prepaidDataPayload);
            
            DynamicJsonDocument prepaidDataDoc(4096); // Increased size for complete pass data
            deserializeJson(prepaidDataDoc, prepaidDataPayload);
            
            // Check current amount
            int currentAmount = prepaidDataDoc["amount"].as<int>();
            // Serial.println("Current amount: " + String(currentAmount));
            
            // Check if amount is sufficient based on vehicle type
            String vehicleType = prepaidDataDoc["passType"].as<String>();
            int minimumBalance = (vehicleType == "cycle") ? 10 : 15;
            
            if (currentAmount < minimumBalance) {
              // Serial.println("❌ INSUFFICIENT BALANCE! Current amount: " + String(currentAmount) + " (minimum required: " + String(minimumBalance) + ")");
              String errorMessage = "Low Balance";
              displayText(errorMessage.c_str());
              showError(); // Red LED and long beep for insufficient balance
              
              
              return;
            }
            
            String currentParkingStatus = prepaidDataDoc["parkingStatus"].as<String>();
            String bikeNumber = prepaidDataDoc["bikeNumber"].as<String>(); // Fetch bike number for prepaid pass
            // Serial.println("Current parking status: " + currentParkingStatus);
            if (bikeNumber.length() > 0) {
              displayText(bikeNumber.c_str());
            }
            // Get current time
            time_t now = time(nullptr);
            struct tm timeinfo;
            // Use UTC time to match mobile app
            gmtime_r(&now, &timeinfo);
            char currentTime[30];
            snprintf(currentTime, sizeof(currentTime), "%04d-%02d-%02dT%02d:%02d:%02d.000Z",
                     timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                     timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
            char dateString[11];
            snprintf(dateString, sizeof(dateString), "%04d-%02d-%02d",
                     timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday);
            
            if (currentParkingStatus == "Exited" || currentParkingStatus == "Not parked") {
              // ENTRY PROCESS - Single PUT request
              // Serial.println("Creating new entry for prepaid pass");
              
              // Update prepaid pass data for entry
              prepaidDataDoc["parkingStatus"] = "Parked";
              prepaidDataDoc["lastEntryTime"] = String(currentTime);
              
              // Add new entry to Entries
              if (!prepaidDataDoc.containsKey("Entries")) {
                prepaidDataDoc.createNestedObject("Entries");
              }
              if (!prepaidDataDoc["Entries"].containsKey(dateString)) {
                prepaidDataDoc["Entries"].createNestedObject(dateString);
              }
              
              // Calculate next index
              int nextIndex = 0;
              Serial.println("🔍 Calculating next index for date: " + String(dateString));
              
              if (prepaidDataDoc["Entries"][dateString].is<JsonArray>()) {
                // Handle JSON array format
                JsonArray entriesArray = prepaidDataDoc["Entries"][dateString].as<JsonArray>();
                nextIndex = entriesArray.size();
                Serial.println("  Found JSON array with " + String(entriesArray.size()) + " entries");
                Serial.println("  Next index will be: " + String(nextIndex));
              } else if (prepaidDataDoc["Entries"][dateString].is<JsonObject>()) {
                // Handle JSON object format
                for (JsonPair kv : prepaidDataDoc["Entries"][dateString].as<JsonObject>()) {
                  int index = String(kv.key().c_str()).toInt();
                  Serial.println("  Found index: " + String(index));
                  if (index >= nextIndex) {
                    nextIndex = index + 1;
                  }
                }
                Serial.println("  Next index will be: " + String(nextIndex));
              } else {
                Serial.println("  No existing entries, starting with index 0");
              }
              
              // Create new entry
              Serial.println("📝 Creating new entry at index: " + String(nextIndex));
              
              if (prepaidDataDoc["Entries"][dateString].is<JsonArray>()) {
                // Handle JSON array format
                JsonArray entriesArray = prepaidDataDoc["Entries"][dateString].as<JsonArray>();
                JsonObject newEntry = entriesArray.createNestedObject();
                newEntry["entryTime"] = String(currentTime);
                newEntry["exitTime"] = "null";
                newEntry["balance"] = currentAmount;
                Serial.println("✅ Entry added to JSON array");
              } else {
                // Handle JSON object format
                JsonObject newEntry = prepaidDataDoc["Entries"][dateString].createNestedObject(String(nextIndex));
                newEntry["entryTime"] = String(currentTime);
                newEntry["exitTime"] = "null";
                newEntry["balance"] = currentAmount;
                Serial.println("✅ Entry added to JSON object");
              }
              
              // Single PUT request to update entire prepaid pass
              String updateUrl = String(firebaseHost) + "/SaidapetStand/prepaidPass/" + prepaidPassId + ".json";
              // Serial.println("Updating prepaid pass data for entry at: " + updateUrl);
              
              http.end();
              http.begin(updateUrl);
              http.addHeader("Content-Type", "application/json");
              
              String updatedPayload;
              serializeJson(prepaidDataDoc, updatedPayload);
              // Serial.println("Updated prepaid payload: " + updatedPayload);
              
              int updateCode = http.PUT(updatedPayload);
              // Serial.println("Prepaid entry update code: " + String(updateCode));
              
              if (updateCode == 200) {
                // Serial.println("✅ Prepaid pass entry created successfully!");
                
                // Audio feedback first (beep sound)
                showSuccess(); // Green LED and single beep for successful entry
                
                // Display entry success message
                displayStat("ENTRY");
                
                // Bike number already displayed at the beginning - no need to show again
              } else {
                // Serial.println("❌ Error creating prepaid entry: " + http.errorToString(updateCode));
                showError(); // Red LED and long beep for entry error
              }
              
            } else if (currentParkingStatus == "Parked") {
              // EXIT PROCESS - Single PUT request
              // Serial.println("Processing exit for prepaid pass");
              
              // Get lastEntryTime for duration calculation
              String lastEntryTime = prepaidDataDoc["lastEntryTime"].as<String>();
              // Serial.println("Last entry time: " + lastEntryTime);
              
              // Calculate duration and amount to deduct
              // Parse lastEntryTime (format: "2025-08-05T10:30:00.000Z")
              int lastYear, lastMonth, lastDay, lastHour, lastMinute, lastSecond;
              sscanf(lastEntryTime.c_str(), "%d-%d-%dT%d:%d:%d", &lastYear, &lastMonth, &lastDay, &lastHour, &lastMinute, &lastSecond);
              
              // Calculate duration in hours based on total time difference
              // Parse lastEntryTime to get the actual entry timestamp
              String lastEntryTimeClean = lastEntryTime;
              lastEntryTimeClean.replace("\"", ""); // Remove quotes if present
              
              // Convert lastEntryTime to time_t for proper calculation
              struct tm entryTime = {0};
              int entryYear, entryMonth, entryDay, entryHour, entryMinute, entrySecond;
              
              // Get current time components
              int currentYear = timeinfo.tm_year + 1900;
              int currentMonth = timeinfo.tm_mon + 1;
              int currentDay = timeinfo.tm_mday;
              int currentHour = timeinfo.tm_hour;
              int currentMinute = timeinfo.tm_min;
              int currentSecond = timeinfo.tm_sec;
              
              int amountToDeduct = 0; // Declare variable here
              
              // Parse the ISO format: YYYY-MM-DDTHH:MM:SS
              if (sscanf(lastEntryTimeClean.c_str(), "%d-%d-%dT%d:%d:%d", 
                         &entryYear, &entryMonth, &entryDay, &entryHour, &entryMinute, &entrySecond) >= 3) {
                
                entryTime.tm_year = entryYear - 1900;
                entryTime.tm_mon = entryMonth - 1;
                entryTime.tm_mday = entryDay;
                entryTime.tm_hour = entryHour;
                entryTime.tm_min = entryMinute;
                entryTime.tm_sec = entrySecond;
                
                // Convert to time_t for calculation
                time_t entryTimestamp = mktime(&entryTime);
                time_t currentTimestamp = mktime(&timeinfo);
                
                // Calculate total duration in hours (including multi-day parking)
                long totalSeconds = currentTimestamp - entryTimestamp;
                int totalHours = totalSeconds / 3600; // Convert seconds to hours
                
                // Serial.println("Entry time: " + String(entryYear) + "-" + String(entryMonth) + "-" + String(entryDay) + " " + String(entryHour) + ":" + String(entryMinute));
                // Serial.println("Current time: " + String(currentYear) + "-" + String(currentMonth) + "-" + String(currentDay) + " " + String(currentHour) + ":" + String(currentMinute));
                // Serial.println("Total duration in hours: " + String(totalHours));
                
                            // Calculate amount to deduct based on total hours and vehicle type
            int adjustedHours = max(0, totalHours - 1);
            
            // Get vehicle type from prepaid pass data
            String vehicleType = prepaidDataDoc["passType"].as<String>();
            
            // Serial.println("Vehicle type: " + vehicleType);
            // Serial.println("Adjusted hours: " + String(adjustedHours));
            
            if (vehicleType == "cycle") {
              // Cycle pricing: 13hrs-₹10, 25hrs-₹20, then ₹10 per 12hrs
              if (adjustedHours <= 12) {
                amountToDeduct = 10;
                // Serial.println("Cycle: 0-13 hours = ₹10");
              } else if (adjustedHours <= 24) {
                amountToDeduct = 20;
                // Serial.println("Cycle: 13-25 hours = ₹20");
              } else {
                amountToDeduct = 20 + ceil((adjustedHours - 24) / 12.0) * 10;
                // Serial.println("Cycle: 25+ hours = ₹" + String(amountToDeduct));
              }
            } else {
              // Bike pricing: 12hrs-₹15, 24hrs-₹30, then ₹15 per 12hrs
              if (adjustedHours <= 12) {
                amountToDeduct = 15;
                // Serial.println("Bike: 0-12 hours = ₹15");
              } else if (adjustedHours <= 24) {
                amountToDeduct = 30;
                // Serial.println("Bike: 12-24 hours = ₹30");
              } else {
                amountToDeduct = 30 + ceil((adjustedHours - 24) / 12.0) * 15;
                // Serial.println("Bike: 24+ hours = ₹" + String(amountToDeduct));
              }
            }
                
                // Serial.println("Amount to deduct: " + String(amountToDeduct));
              } else {
                // Fallback to old calculation if parsing fails
                // Serial.println("⚠️ Failed to parse entry time, using fallback calculation");
                int hours = currentHour - lastHour;
                if (hours < 0) hours += 24; // Handle day change
                
                int adjustedHours = max(0, hours - 1);
                
                // Get vehicle type from prepaid pass data
                String vehicleType = prepaidDataDoc["passType"].as<String>();
                
                if (vehicleType == "cycle") {
                  // Cycle pricing: 13hrs-₹10, 25hrs-₹20, then ₹10 per 12hrs
                  if (adjustedHours <= 12) {
                    amountToDeduct = 10;
                  } else if (adjustedHours <= 24) {
                    amountToDeduct = 20;
                  } else {
                    amountToDeduct = 20 + ceil((adjustedHours - 24) / 12.0) * 10;
                  }
                } else {
                  // Bike pricing: 12hrs-₹15, 24hrs-₹30, then ₹15 per 12hrs
                  if (adjustedHours <= 12) {
                    amountToDeduct = 15;
                  } else if (adjustedHours <= 24) {
                    amountToDeduct = 30;
                  } else {
                    amountToDeduct = 30 + ceil((adjustedHours - 24) / 12.0) * 15;
                  }
                }
              }
              
              // Serial.println("Amount to deduct: " + String(amountToDeduct));
              
              // Check if sufficient balance
              if (currentAmount < amountToDeduct) {
                // Serial.println("❌ INSUFFICIENT BALANCE for exit! Required: " + String(amountToDeduct) + ", Available: " + String(currentAmount));
                String errorMessage = "Low Balance";
                displayText(errorMessage.c_str());
                showError(); // Red LED and long beep for insufficient balance
               
                return;
              }
              
              // Calculate new balance
              int newBalance = currentAmount - amountToDeduct;
              // Serial.println("New balance: " + String(newBalance));
              
              // Update prepaid pass data for exit
              prepaidDataDoc["parkingStatus"] = "Exited";
              prepaidDataDoc["lastExitTime"] = String(currentTime);
              prepaidDataDoc["amount"] = newBalance;
              
              // Extract date from lastEntryTime to find the correct entry
              char entryDateString[11];
              
              // Remove quotes if present and extract date part
              lastEntryTime.replace("\"", "");
              int tIndex = lastEntryTime.indexOf('T');
              if (tIndex > 0) {
                lastEntryTime = lastEntryTime.substring(0, tIndex);
              }
              
              // Parse the date (format: YYYY-MM-DD) - reuse existing variables
              sscanf(lastEntryTime.c_str(), "%d-%d-%d", &entryYear, &entryMonth, &entryDay);
              snprintf(entryDateString, sizeof(entryDateString), "%04d-%02d-%02d", entryYear, entryMonth, entryDay);
              
              // Find and update the last entry with exit details using the entry date
              Serial.println("🔍 Checking if Entries node exists for date: " + String(entryDateString));
              if (prepaidDataDoc.containsKey("Entries") && prepaidDataDoc["Entries"].containsKey(entryDateString)) {
                Serial.println("✅ Entries node found for date: " + String(entryDateString));
                JsonObject entriesForDate = prepaidDataDoc["Entries"][entryDateString];
                int lastIndex = -1;
                
                // Find the highest index
                Serial.println("🔍 Finding highest index in entries...");
                // Try to iterate as object first (most common case)
                bool hasKeys = false;
                for (JsonPair kv : entriesForDate) {
                  hasKeys = true;
                  int index = String(kv.key().c_str()).toInt();
                  Serial.println("  Found index: " + String(index));
                  if (index > lastIndex) {
                    lastIndex = index;
                  }
                }
                
                if (!hasKeys) {
                  // If no keys found, it might be an array or empty
                  Serial.println("  No keys found, checking if it's an array...");
                  // For array format, we need to access it differently
                  // Since entriesForDate is already a JsonObject, we need to check the parent
                  if (prepaidDataDoc["Entries"][entryDateString].is<JsonArray>()) {
                    JsonArray entriesArray = prepaidDataDoc["Entries"][entryDateString].as<JsonArray>();
                    lastIndex = entriesArray.size() - 1;
                    Serial.println("  Found JSON array with " + String(entriesArray.size()) + " entries");
                    Serial.println("  Using last index: " + String(lastIndex));
                  }
                }
                Serial.println("📊 Highest index found: " + String(lastIndex));
                
                // Update the last entry with exit details
                if (lastIndex >= 0) {
                  Serial.println("✅ Updating entry at index: " + String(lastIndex));
                  // Check if it's an array format by trying to access the parent
                  if (prepaidDataDoc["Entries"][entryDateString].is<JsonArray>()) {
                    // Handle JSON array format
                    JsonArray entriesArray = prepaidDataDoc["Entries"][entryDateString].as<JsonArray>();
                    JsonObject lastEntry = entriesArray[lastIndex];
                    lastEntry["exitTime"] = String(currentTime);
                    lastEntry["balance"] = newBalance;
                    lastEntry["exitAmount"] = amountToDeduct;
                    Serial.println("📝 Updated exitTime to: " + String(currentTime));
                    Serial.println("📝 Updated balance to: " + String(newBalance));
                    Serial.println("📝 Updated exitAmount to: " + String(amountToDeduct));
                  } else {
                    // Handle JSON object format
                    JsonObject lastEntry = entriesForDate[String(lastIndex)];
                    lastEntry["exitTime"] = String(currentTime);
                    lastEntry["balance"] = newBalance;
                    lastEntry["exitAmount"] = amountToDeduct;
                    Serial.println("📝 Updated exitTime to: " + String(currentTime));
                    Serial.println("📝 Updated balance to: " + String(newBalance));
                    Serial.println("📝 Updated exitAmount to: " + String(amountToDeduct));
                  }
                } else {
                  Serial.println("❌ No valid index found to update");
                }
              } else {
                Serial.println("❌ Entries node not found for date: " + String(entryDateString));
                Serial.println("🔍 Available dates in Entries:");
                if (prepaidDataDoc.containsKey("Entries")) {
                  for (JsonPair kv : prepaidDataDoc["Entries"].as<JsonObject>()) {
                    Serial.println("  - " + String(kv.key().c_str()));
                  }
                } else {
                  Serial.println("  - No Entries node exists");
                }
              }
              
              // Single PUT request to update entire prepaid pass
              String updateUrl = String(firebaseHost) + "/SaidapetStand/prepaidPass/" + prepaidPassId + ".json";
              // Serial.println("Updating prepaid pass data for exit at: " + updateUrl);
              
              http.end();
              http.begin(updateUrl);
              http.addHeader("Content-Type", "application/json");
              
              String updatedPayload;
              serializeJson(prepaidDataDoc, updatedPayload);
              // Serial.println("Updated prepaid payload: " + updatedPayload);
              
              int updateCode = http.PUT(updatedPayload);
              // Serial.println("Prepaid exit update code: " + String(updateCode));
              
              if (updateCode == 200) {
                // Serial.println("✅ Prepaid pass exit processed successfully!");
                // Serial.println("Deducted: " + String(amountToDeduct) + ", New balance: " + String(newBalance));
                
                // Audio feedback first (beep sound)
                showExit(); // Purple LED and double beep for successful exit
                
                // Display exit success message
                displayStat("EXIT");
                
                // Bike number already displayed at the beginning - no need to show again
              } else {
                // Serial.println("❌ Error processing prepaid exit: " + http.errorToString(updateCode));
                showError(); // Red LED and long beep for exit error
              }
            } else {
              // Serial.println("Unknown prepaid parking status: " + currentParkingStatus);
              showError(); // Red LED and long beep for unknown status
            }
            
            http.end();
          } else {
            // Serial.println("❌ Failed to fetch prepaid pass data. HTTP code: " + String(prepaidDataCode));
            showError(); // Red LED and long beep for fetch error
          }
        }
      } else {
        // Serial.println("❌ Card not found in PREPAID PASS database");
        // Serial.println("❌ Card not registered in any database");
        displayStat("X X X X X X");
        showError(); // Red LED and long beep for fetch error
      }
    } else {
      // Serial.println("❌ Error searching prepaid pass. HTTP code: " + String(prepaidHttpCode));
      // Serial.println("❌ Card not registered in any database");
      showError();
    }
  }
  } else {
    // Serial.println("❌ Card not found in MONTHLY PASS database");
    showError();
    http.end();
  }

  delay(2000); // Prevent multiple scans
  
  // Ready message will be shown automatically when display timer expires
}