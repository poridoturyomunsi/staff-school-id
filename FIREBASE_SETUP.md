# Firebase Setup Guide

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter your project name (e.g., "St. Paul Staff ID Management")
4. Complete the setup process

## Step 2: Set Up Authentication

1. In Firebase Console, go to **Build** > **Authentication**
2. Click "Get started"
3. Enable **Email/Password** authentication (for admin use)
4. Optionally enable Google Sign-in

## Step 3: Create Firestore Database

1. Go to **Build** > **Firestore Database**
2. Click "Create database"
3. Select **Production mode**
4. Choose a location close to your users
5. Click "Enable"

## Step 4: Set Up Firebase Storage

1. Go to **Build** > **Storage**
2. Click "Get started"
3. Start in production mode
4. Choose the same location as Firestore
5. Click "Done"

## Step 5: Get Your Firebase Config

1. Go to **Project Settings** (gear icon)
2. Click the **General** tab
3. Under "Your apps", find your web app
4. Copy the Firebase config

## Step 6: Configure Environment Variables

Create/Update `.env.local` file in your project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Step 7: Create Firestore Security Rules

Replace your Firestore security rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /staff/{document=**} {
      allow read, write: if true;  // For development only
      // In production, add proper authentication
    }
    match /school_settings/{document=**} {
      allow read, write: if true;
    }
    match /card_templates/{document=**} {
      allow read, write: if true;
    }
    match /print_history/{document=**} {
      allow read, write: if true;
    }
    match /designations/{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Step 8: Set Up Storage Security Rules

Replace your Storage security rules with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;  // For development only
      // In production, add proper authentication
    }
  }
}
```

## Step 9: Test Your Setup

1. Run: `npm run dev`
2. Your app should now:
   - Connect to Firebase
   - Show "Firebase initialized successfully" in console
   - Store staff data in Firestore
   - Upload photos/signatures to Storage

## Database Collections

The app will automatically create these collections:

- **staff** - Staff member records with all information
- **school_settings** - School configuration
- **card_templates** - ID card templates
- **print_history** - Print logs
- **designations** - Available designations

## Features Implemented

✅ **Permanent Data Storage**: All staff data persists in Firestore
✅ **Photo Upload**: Staff photos stored in Firebase Storage
✅ **Signature Storage**: Staff signatures stored in Firebase Storage
✅ **Real-time Updates**: Live sync across tabs/devices
✅ **Offline Support**: Can work locally when offline
✅ **Auto-save**: Data saved automatically when added
✅ **Permanent Records**: Data survives app restart
