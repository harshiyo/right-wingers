# Firebase Backup System

This directory contains a comprehensive backup solution for your Firebase Firestore database. The system automatically backs up all your collections and can be scheduled to run every weekend.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd shared
npm install
```

### 2. Set Up Service Account
You need a Firebase service account key to access your database:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`right-wingers`)
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file as `service-account-key.json` in this directory
6. **IMPORTANT**: Never commit this file to version control!

### 3. Test the Backup
```bash
# Run a basic backup
npm run backup

# Run backup with cloud storage upload
npm run backup:upload

# Run backup with cleanup of old backups
npm run backup:cleanup

# Run full backup (upload + cleanup)
npm run backup:full
```

## 📅 Automated Weekend Backups

### Option 1: Windows Task Scheduler (Recommended)

1. **Run as Administrator**: Right-click PowerShell and select "Run as Administrator"
2. **Execute the setup script**:
   ```powershell
   .\setup-scheduled-backup.ps1
   ```
3. **Verify the task**:
   ```powershell
   Get-ScheduledTask -TaskName "Firebase Weekend Backup"
   ```

The backup will now run automatically every **Saturday at 2:00 AM**.

### Option 2: Manual Batch File
Double-click `run-backup.bat` to run a backup immediately.

### Option 3: PowerShell Script
```powershell
# Standard backup
.\run-backup.ps1

# With cloud storage upload
.\run-backup.ps1 -Upload

# With cleanup
.\run-backup.ps1 -Cleanup

# Full backup (upload + cleanup)
.\run-backup.ps1 -Full
```

## 📁 What Gets Backed Up

The system backs up these collections:
- `users` - User accounts and authentication data
- `stores` - Store information and settings
- `orders` - All customer orders
- `customers` - Customer information
- `menu` - Menu items and pricing
- `categories` - Menu categories
- `combos` - Combo deals and packages
- `toppings` - Pizza toppings and add-ons
- `sauces` - Wing sauces and condiments
- `discountCodes` - Promotional codes
- `deliveryCharges` - Delivery fee structure
- `inventory` - Stock levels and tracking
- `jobStatus` - Job scheduling data
- `marketing` - Marketing campaigns
- `roleManagement` - User roles and permissions

## 📊 Backup Output

Each backup creates a timestamped directory containing:
- Individual JSON files for each collection
- A `backup-summary.json` with overall statistics
- Log files for troubleshooting

Example structure:
```
backups/
├── 2024-01-20T02-00-00-000Z/
│   ├── users.json
│   ├── stores.json
│   ├── orders.json
│   ├── ...
│   └── backup-summary.json
└── 2024-01-13T02-00-00-000Z/
    └── ...
```

## ☁️ Cloud Storage Upload

To enable cloud storage uploads:

1. **Create a Cloud Storage bucket**:
   ```bash
   gsutil mb gs://right-wingers-backups
   ```

2. **Set bucket permissions**:
   ```bash
   gsutil iam ch allUsers:objectViewer gs://right-wingers-backups
   ```

3. **Run backup with upload**:
   ```bash
   npm run backup:upload
   ```

## 🧹 Automatic Cleanup

The system automatically removes backups older than 30 days to save disk space. You can customize this in the script.

## 🔧 Customization

### Modify Collections
Edit the `collections` array in `backup-script.js`:

```javascript
const collections = [
  'users',
  'stores',
  'orders',
  // Add or remove collections as needed
];
```

### Change Backup Schedule
Edit `setup-scheduled-backup.ps1` to modify the schedule:

```powershell
# Change from Saturday to Sunday
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2:00AM

# Change time to 3:00 AM
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 3:00AM
```

### Adjust Cleanup Age
Modify the cleanup function in `backup-script.js`:

```javascript
await backupService.cleanupOldBackups(60); // Keep backups for 60 days
```

## 🚨 Troubleshooting

### Common Issues

1. **"Service account key not found"**
   - Ensure `service-account-key.json` exists in the shared directory
   - Verify the file has the correct permissions

2. **"Permission denied"**
   - Run PowerShell as Administrator for task scheduler setup
   - Check Firebase service account permissions

3. **"Node.js not found"**
   - Install Node.js from [nodejs.org](https://nodejs.org/)
   - Ensure it's added to your PATH

4. **"Backup failed"**
   - Check the log files in the backup directory
   - Verify your internet connection
   - Check Firebase project status

### Manual Recovery

If automated backups fail, you can:

1. **Run manually**:
   ```bash
   npm run backup
   ```

2. **Check logs**:
   ```bash
   Get-Content backup.log -Tail 50
   ```

3. **Verify Firebase connection**:
   ```bash
   node -e "const admin = require('firebase-admin'); console.log('Firebase Admin SDK loaded successfully')"
   ```

## 📋 Maintenance

### Regular Tasks

- **Monthly**: Review backup logs for errors
- **Quarterly**: Test restore process with sample data
- **Annually**: Review and update backup collections list

### Monitoring

- Check backup directory size regularly
- Monitor cloud storage costs (if using)
- Verify backup completion emails/notifications

## 🔒 Security Notes

- **Never commit** `service-account-key.json` to version control
- **Restrict access** to backup directories
- **Use IAM roles** with minimal required permissions
- **Encrypt backups** if containing sensitive data
- **Test restore process** regularly

## 📞 Support

If you encounter issues:

1. Check the log files first
2. Verify Firebase project status
3. Test with a simple backup command
4. Check Windows Task Scheduler status

For additional help, refer to:
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Windows Task Scheduler Documentation](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page)
