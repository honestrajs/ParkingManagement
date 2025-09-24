# ParkingManagement

This repository contains the parking management system components organized by role and functionality.

## Repository Structure

```
ParkingManagement/
├── employee/          # Employee mobile application
├── Manager/           # Manager dashboard/application (ArakkonamBikeStandManager)
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

## Manager Application

The `Manager/` directory contains the ArakkonamBikeStandManager React Native application for parking managers. This app provides management capabilities including:

- **Dashboard Management**: Overview of parking operations
- **Employee Management**: Monitor and manage employee activities
- **Analytics & Reports**: View parking statistics and reports
- **System Configuration**: Manage parking settings and rules
- **Real-time Monitoring**: Track parking status and activities

### Key Features

- **Manager Dashboard**: Comprehensive overview of parking operations
- **Employee Oversight**: Monitor employee activities and performance
- **Data Analytics**: View reports and statistics
- **System Administration**: Configure parking rules and settings
- **Real-time Updates**: Live monitoring of parking activities

### Technology Stack

- React Native with TypeScript
- Firebase (Authentication & Database)
- React Navigation
- Custom UI components and charts

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

#### Employee Application

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

#### Manager Application

1. Navigate to the Manager directory:
   ```bash
   cd Manager/
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
