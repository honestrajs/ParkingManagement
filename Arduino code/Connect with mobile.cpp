// Minimal RFID -> USB serial forwarder
// Prints only one line per scan: [CARD]ABC57B05

#include <SPI.h>
#include <MFRC522.h>

// RFID Pins
#define RST_PIN 4   // RC522 RST
#define SS_PIN  5   // RC522 SDA/SS

// Buzzer Pin
#define BUZZER_PIN 15  // GPIO15 (G15)

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  
  // Setup buzzer pin
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
}

// Function to play buzzer tone
void playBuzzerTone() {
  // Play a short beep (500ms)
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  String uidStr;
 
  uidStr.reserve(2 * rfid.uid.size);
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(rfid.uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();

  Serial.print("[CARD]");
  Serial.println(uidStr);
  Serial.flush();

  // Play buzzer tone when card is scanned
  playBuzzerTone();

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(50); // small debounce
}