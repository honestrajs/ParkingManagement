#include <SPI.h>
#include <MFRC522.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// RFID Pins
#define RST_PIN         4   // RC522 RST
#define SS_PIN          5   // RC522 SDA/SS



// Add after BUZZER_PIN
#define SOUND_PIN 26  // GPIO 26 for extra sound
#define SOUND_CHANNEL 0 // PWM channel for sound

// BLE UUIDs
#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

MFRC522 rfid(SS_PIN, RST_PIN);

BLECharacteristic *pCharacteristic;
BLEServer *pServer;
bool deviceConnected = false;

class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("BLE client connected");
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("BLE client disconnected");
    // Restart advertising so the app can reconnect
    pServer->getAdvertising()->start();
    Serial.println("BLE advertising restarted");
  }
};

// Add playLoudBeep for passive buzzer (PWM/tone)
void playLoudBeep(int freq, int duration) {
  tone(SOUND_PIN, freq, duration); // Start tone
  delay(duration);
  noTone(SOUND_PIN);               // Stop tone
}

void playSuccessSound() {
  playLoudBeep(1000, 100);
  delay(80);
  playLoudBeep(1500, 100);
  delay(80);
  playLoudBeep(2000, 200);
}

void setup() {
  Serial.begin(115200);
  SPI.begin();             // Init SPI bus
  rfid.PCD_Init();         // Init RC522


  // BLE Setup
  BLEDevice::init("BikeStandRFID"); // Name shown to phone
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
                    );
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  pServer->getAdvertising()->start();
  Serial.println("BLE Ready, waiting for client...");

  Serial.println("Ready! Scan RFID card...");
}

void loop() {
  // Look for new cards
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Build UID string
  String uidStr = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(rfid.uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();

  Serial.print("Card UID: ");
  Serial.println(uidStr);
  playSuccessSound();

  // Send UID over BLE
  if (deviceConnected) {
    pCharacteristic->setValue(uidStr.c_str());
    pCharacteristic->notify();
    Serial.println("Sent UID over BLE");
  } else {
    Serial.println("No BLE client connected, not sent");
  }

  // 💡 Show LED - Green for valid scan
  // Remove LED logic
  // Play custom sound pattern
  

  // Halt card
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}