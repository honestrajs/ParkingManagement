# ParkingManagement

This repository contains the parking management system components organized by role and functionality.

## Repository Structure

```
ParkingManagement/
├── employee/          # Employee mobile application
├── Manager/           # Manager dashboard/application
├── Arduino code/      # Hardware control code
└── README.md         # This file
```

## Employee Application

The `employee/` directory contains the React Native mobile application for parking employees. This app allows employees to:

- Manage parking entries and exits
- Handle monthly and prepaid passes
- Process payments
- View parking history
- Manage bike stand operations

### Key Features

- **Entry Management**: Process vehicle entries with real-time tracking
- **Exit Processing**: Handle vehicle exits and calculate parking fees
- **Pass Management**: Create and manage monthly and prepaid passes
- **Payment Processing**: Handle various payment methods
- **History Tracking**: Maintain records of all parking transactions

### Technology Stack

- React Native
- Firebase (Authentication & Database)
- React Navigation
- Various UI libraries and components

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. Navigate to the employee directory:
   ```bash
   cd employee/
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For iOS (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

4. Run the application:
   ```bash
   # For Android
   npx react-native run-android
   
   # For iOS
   npx react-native run-ios
   ```

## Configuration

Make sure to configure Firebase settings in the `firebase.js` file before running the application.

## Contributing

Please ensure all code follows the project's coding standards and includes appropriate tests.

## License

This project is proprietary software. All rights reserved.
