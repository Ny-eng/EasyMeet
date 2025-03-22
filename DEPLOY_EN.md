# Easy Meet - Deployment Instructions

This document provides detailed instructions for deploying the Easy Meet application to a production environment.

## Quick Start Guide (Simple Deployment)

For a quick deployment, follow these simplified steps:

1. **Firebase Setup**:
   - Create a project in [Firebase Console](https://console.firebase.google.com/)
   - Register a web app and save the configuration
   - Create a Firestore database in "test mode"

2. **Deploy Firebase Functions**:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add  # Select your project ID
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

3. **Deploy to Vercel**:
   - Login to [Vercel](https://vercel.com/) with your GitHub account
   - Click "New Project" and import your GitHub repository
   - Add Firebase configuration as environment variables (VITE_FIREBASE_API_KEY, etc.)
   - Select "Vite" as the Framework Preset and click "Deploy"

For more detailed instructions, refer to the sections below.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Custom Domain Configuration](#custom-domain-configuration)
5. [Expired Events Automatic Cleanup Setup](#expired-events-automatic-cleanup-setup)
6. [Maintenance and Monitoring](#maintenance-and-monitoring)

## Prerequisites

Before starting the deployment, ensure you have:

- A Google account (for Firebase)
- A GitHub account (for Vercel integration)
- A custom domain (optional)

## Firebase Setup

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and log in with your Google account.
2. Click the "Add project" button.
3. Enter a project name, such as "easy-meet".
4. Enable Google Analytics if desired (recommended).
5. Click "Create project" and wait for the process to complete.

### 2. Register a Firebase Web App

1. From the project dashboard, click on the web icon (`</>`).
2. Enter a name for your app (e.g., "easy-meet-web").
3. Check the option "Also set up Firebase Hosting".
4. Click "Register app".
5. Note the configuration information shown, as you'll need this for Vercel deployment. Specifically, record:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId

### 3. Set Up Firestore Database

1. Select "Firestore Database" from the left menu.
2. Click "Create database".
3. Select "Start in test mode" (you can change to production mode later).
4. Choose a location for your database (select the closest to your target users) and click "Enable".

### 4. Install and Log In to Firebase CLI

On your development computer, follow these steps:

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Log in to Firebase
firebase login

# Initialize in your project directory (may not be necessary if firebase.json already exists)
cd your-project-directory
firebase use --add
# When prompted, select your Firebase project ID and set an alias
```

### 5. Deploy Firebase Functions

```bash
# Navigate to the functions directory
cd functions

# Install dependencies
npm install

# Build
npm run build

# Deploy only functions
firebase deploy --only functions
```

Upon successful deployment, you'll see URLs like:
```
Function URL (api): https://us-central1-your-project-id.cloudfunctions.net/api
Function URL (cleanupExpiredEvents): https://us-central1-your-project-id.cloudfunctions.net/cleanupExpiredEvents
```

Take note of the `api` URL as it's important for the next steps.

## Vercel Deployment

### 1. Create a Vercel Account

1. Go to [Vercel](https://vercel.com/) and sign up or log in using your GitHub account.

### 2. Prepare GitHub Repository

1. Upload your project to a GitHub repository.
2. Ensure the repository is accessible to Vercel if it's private.

### 3. Import Project to Vercel

1. On the Vercel dashboard, click the "New Project" button.
2. Select the option to import a GitHub repository.
3. Choose your project repository.

### 4. Configure Environment Variables

Set up the following environment variables:

| Variable Name | Value | Description |
|--------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Copy from Firebase Console | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Copy from Firebase Console | Firebase authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Copy from Firebase Console | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Copy from Firebase Console | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Copy from Firebase Console | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Copy from Firebase Console | Firebase app ID |
| `VITE_FIREBASE_API_URL` | https://us-central1-your-project-id.cloudfunctions.net | Functions URL |

### 5. Build Configuration

1. Framework Preset: `Vite`
2. Build Command: Already configured in vercel.json (no changes needed)
3. Output Directory: Already configured in vercel.json (no changes needed)
4. Install Command: `npm install`

### 6. Start Deployment

Click the "Deploy" button to start the deployment process. This may take a few minutes.

Once complete, Vercel will display a deployment summary page. Click the "Visit" button to check your deployed application.

## Custom Domain Configuration

### 1. Add a Custom Domain to Vercel

1. From the Vercel dashboard, select your project.
2. Go to the "Settings" tab and select the "Domains" section.
3. Enter your desired domain (e.g., `easymeet.example.com`) and click "Add".
4. Follow Vercel's DNS configuration instructions to set up your domain.

### 2. Configure Custom Domain for Firebase (if needed)

1. In the Firebase Console, select your project.
2. Select "Hosting" from the left menu.
3. Click "Add domain".
4. Enter your custom domain (e.g., `api.easymeet.example.com`).
5. Add the DNS verification record shown.
6. Once verified, click "Continue".
7. Click "Finish".

## Expired Events Automatic Cleanup Setup

The Firebase Functions include functionality to automatically delete expired events. To make this run regularly, set up a GCP (Google Cloud Platform) scheduler:

### 1. Configure Google Cloud Scheduler

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Search for and select "Cloud Scheduler" from the left menu.
3. Click "Create job".
4. Enter the following information:
   - Name: `cleanup-expired-events`
   - Description: `Delete expired events from Firestore`
   - Frequency: `0 0 * * *` (runs at midnight every day)
   - Timezone: `Asia/Tokyo` (or your preferred timezone)
   - Target type: `HTTP`
   - URL: `https://us-central1-your-project-id.cloudfunctions.net/cleanupExpiredEvents`
   - HTTP method: `GET`
   - Authentication header: `None` (or configure as needed)

5. Click "Create".

This will run the expired events cleanup process automatically at midnight every day.

## Maintenance and Monitoring

### 1. Check Firebase Console Regularly

Regularly check the following in the Firebase Console:

- Firestore database usage
- Functions logs and errors
- Periodic review of security rules

### 2. Monitor Vercel

Check the following in the Vercel dashboard:

- Deployment history and status
- Performance metrics in the Analytics tab
- Error logs

### 3. Regular Backups (Recommended)

It's recommended to regularly back up your Firestore data. This can be automated using Google Cloud Scheduler.

---

These are the deployment instructions for the Easy Meet application. If you encounter any issues, refer to the documentation for each service or contact support.