# POS System Monorepo

This monorepo contains all the applications for the POS system:

- **Admin Dashboard**: Web application for managing the POS system
- **POS Client**: Desktop application for point of sale operations
- **Online Ordering**: Web application for customers to place orders online
- **Shared**: Common utilities and services used across applications

## Project Structure

```
pos-monorepo/
├── admin-dashboard/     # Admin dashboard web application
├── pos-client/         # POS client desktop application
├── online-ordering/    # Online ordering web application
└── shared/            # Shared utilities and services
```

## Setup Instructions

1. Install dependencies for all applications:
```bash
npm run install:all
```

Or install dependencies for specific applications:
```bash
npm run install:admin    # Install admin dashboard dependencies
npm run install:pos      # Install POS client dependencies
npm run install:online   # Install online ordering dependencies
```

## Building Applications

Build all applications:

```bash
npm run build:admin   # Build admin dashboard
npm run build:pos    # Build POS client
npm run build:online # Build online ordering
```

## Environment Setup

The Firebase configuration is now hardcoded to use the real Firebase project "right-wingers". 
To control whether to use Firebase emulators in development, set the following environment variable:

### Firebase Emulator Control
```env
# Set to 'true' to use Firebase emulators in development
# Set to 'false' or remove to use real Firebase database
VITE_USE_FIREBASE_EMULATORS=false
```

**Note**: The Firebase configuration is now hardcoded in the service files using the real Firebase project credentials. 
You no longer need to set individual Firebase environment variables.

### Previous Environment Variables (No longer needed)
The following environment variables are no longer required as Firebase config is hardcoded:

```env
# These are no longer needed - Firebase config is hardcoded
# VITE_FIREBASE_API_KEY=your_api_key
# VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
# VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
# VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
# VITE_FIREBASE_APP_ID=your_app_id
```

## Development

Start development servers:

```bash
npm run dev:admin     # Start admin dashboard
npm run dev:pos      # Start POS client
npm run dev:online   # Start online ordering
```

**By default, all applications will connect to the real Firebase database.**
To use emulators during development, set `VITE_USE_FIREBASE_EMULATORS=true` in your environment.

## Deployment

Each application can be deployed independently:

- **Admin Dashboard**: Firebase Hosting or any static hosting
- **POS Client**: Electron desktop application
- **Online Ordering**: Firebase Hosting or any static hosting

## Common Issues

1. If you get dependency conflicts, try:
```bash
npm clean-install
```

2. For Firebase emulator issues:
```bash
firebase emulators:start
```

3. For Electron build issues on Windows:
```bash
npm install --global windows-build-tools
``` 