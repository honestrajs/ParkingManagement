# Arduino Code

This directory contains the Arduino/ESP32 code for the parking management system hardware components.

## Hardware Components

- **ESP32 Microcontroller**: Main processing unit
- **RFID Scanner**: For reading RFID tags/cards
- **Servo Motor**: For gate control
- **LED Indicators**: Status indicators
- **Buzzer**: Audio feedback
- **LCD Display**: Information display

## Files

- `parking_system.ino` - Main Arduino sketch for parking system
- `rfid_scanner.ino` - RFID scanning functionality
- `gate_control.ino` - Servo motor gate control
- `lcd_display.ino` - LCD display management
- `wifi_communication.ino` - WiFi communication with mobile app

## Setup Instructions

1. Install Arduino IDE
2. Install ESP32 board package
3. Install required libraries:
   - MFRC522 (RFID)
   - Servo
   - LiquidCrystal_I2C
   - WiFi
   - FirebaseArduino
4. Upload the code to ESP32
5. Configure WiFi credentials
6. Test RFID scanning and gate control

## Pin Configuration

- RFID RST Pin: 22
- RFID SS Pin: 21
- Servo Pin: 18
- LED Pins: 2, 4, 5
- Buzzer Pin: 23
- LCD SDA: 21
- LCD SCL: 22
