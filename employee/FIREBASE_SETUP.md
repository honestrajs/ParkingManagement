# Firebase Setup for BikeStandApp

## Database Structure

### Main Database Tree: `ArakkonamBikeStand`

#### 1. Bike Entries
```
ArakkonamBikeStand/
├── BikeEntries/
│   ├── BIK-20240115103000123/
│   │   ├── token: "BIK-20240115103000123"
│   │   ├── time: "2024-01-15T10:30:00Z"
│   │   ├── imageUrl: "https://..."
│   │   ├── bikeNumber: "KA01AB1234"
│   │   ├── paymentMode: "Cash"
│   │   ├── exitAmount: "15"
│   │   ├── paid: "Yes"
│   │   ├── employeeId: "user123"
│   │   └── status: "Parked"
│   └── ...
```

#### 2. Cycle Entries
```
ArakkonamBikeStand/
├── CycleEntries/
│   ├── CYC-20240115104000789/
│   │   ├── token: "CYC-20240115104000789"
│   │   ├── time: "2024-01-15T10:40:00Z"
│   │   ├── imageUrl: "https://..."
│   │   ├── vehicleType: "cycle"
│   │   ├── paymentMode: "Cash"
│   │   ├── exitAmount: "15"
│   │   ├── paid: "Yes"
│   │   ├── employeeId: "user123"
│   │   └── status: "Parked"
│   └── ...
```

#### 3. Monthly Passes
```
ArakkonamBikeStand/
├── monthlyPass/
│   ├── PASS-1705310400000/
│   │   ├── passId: "PASS-1705310400000"
│   │   ├── bikeNumber: "KA01AB1234"
│   │   ├── holderName: "John Doe"
│   │   ├── phoneNumber: "9876543210"
│   │   ├── cardId: "CARD123456"
│   │   ├── startDate: "2024-01-15T00:00:00Z"
│   │   ├── validUntil: "2024-02-14T00:00:00Z"
│   │   ├── duration: 30
│   │   ├── imageUrl: "https://..."
│   │   ├── status: "active"
│   │   ├── parkingStatus: "Not parked"
│   │   └── paymentMethod: "Cash"
│   └── ...
```

#### 4. Prepaid Passes
```
ArakkonamBikeStand/
├── prepaidPass/
│   ├── Prepaid-1705310400000/
│   │   ├── passId: "Prepaid-1705310400000"
│   │   ├── bikeNumber: "KA01AB1234"
│   │   ├── holderName: "Jane Doe"
│   │   ├── phoneNumber: "9876543210"
│   │   ├── cardId: "CARD789012"
│   │   ├── amount: 1000
│   │   ├── imageUrl: "https://..."
│   │   ├── parkingStatus: "Not parked"
│   │   └── paymentMethod: "Cash"
│   └── ...
```

#### 5. Employee Collections
```
ArakkonamBikeStand/
├── EmployeeCollections/
│   ├── user123/
│   │   ├── 2024-01-15/
│   │   │   ├── entryCollections: 150
│   │   │   ├── exitCollections: 75
│   │   │   ├── rechargeCollections: 200
│   │   │   ├── passCollections: 500
│   │   │   ├── totalAmount: 925
│   │   │   ├── cashAmount: 600
│   │   │   ├── upiAmount: 325
│   │   │   └── transactions: [
│   │   │       {
│   │   │         type: "entry",
│   │   │         amount: 15,
│   │   │         paymentMode: "Cash",
│   │   │         timestamp: "2024-01-15T10:30:00Z",
│   │   │         reference: "BIK-20240115103000123",
│   │   │         description: "Bike entry - KA01AB1234"
│   │   │       }
│   │   │     ]
│   │   └── ...
│   └── ...
```

#### 6. Settings (New)
```
ArakkonamBikeStand/
├── settings/
│   ├── monthlyPassAmount: 500
│   ├── dailyEntryAmount: 15
│   ├── graceTimeHours: 1
│   └── ...
```

## Firebase Storage Structure

### Images Storage
```
ArakkonamBikeStand/
├── bike_entries/
│   ├── BIK-20240115103000123.jpg
│   ├── BIK-20240115103500456.jpg
│   └── ...
├── cycle_entries/
│   ├── CYC-20240115104000789.jpg
│   └── ...
├── monthly_passes/
│   ├── CARD123456.jpg
│   └── ...
└── prepaid_passes/
    ├── 1705310400000.jpg
    └── ...
```

## Setup Instructions

1. **Create Database Structure**: Use the Firebase Console to create the initial database structure
2. **Set Monthly Pass Amount**: Add the monthly pass amount in `ArakkonamBikeStand/settings/monthlyPassAmount`
3. **Configure Storage Rules**: Ensure proper read/write permissions for the app
4. **Test Image Uploads**: Verify that images are being stored in the correct folders

## Important Notes

- All amounts are stored as numbers (not strings) for proper calculations
- Image URLs are stored as full Firebase Storage URLs
- Employee collections are tracked daily with detailed transaction history
- Settings can be updated from the Firebase Console for dynamic pricing 