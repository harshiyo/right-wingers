const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// Initialize Firebase Admin SDK
const serviceAccount = require('./service-account-key.json'); // You'll need to create this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'right-wingers'
});

const db = admin.firestore();
const storage = new Storage({
  projectId: 'right-wingers',
  keyFilename: './service-account-key.json'
});

class FirebaseBackupService {
  constructor() {
    this.backupDir = path.join(__dirname, 'backups');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupPath = path.join(this.backupDir, this.timestamp);
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
  }

  async backupCollection(collectionName) {
    console.log(`Backing up collection: ${collectionName}`);
    
    try {
      const snapshot = await db.collection(collectionName).get();
      const documents = [];
      
      snapshot.forEach(doc => {
        // Store document data directly at root level, not nested under 'data'
        const docData = {
          id: doc.id,
          ...doc.data(), // Spread the document data directly
          createTime: doc.createTime?.toDate?.()?.toISOString(),
          updateTime: doc.updateTime?.toDate?.()?.toISOString()
        };
        documents.push(docData);
      });
      
      const backupData = {
        collection: collectionName,
        timestamp: new Date().toISOString(),
        documentCount: documents.length,
        documents: documents
      };
      
      const filePath = path.join(this.backupPath, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      
      console.log(`✓ Backed up ${documents.length} documents from ${collectionName}`);
      return { collection: collectionName, count: documents.length, filePath };
    } catch (error) {
      console.error(`✗ Error backing up ${collectionName}:`, error.message);
      return { collection: collectionName, error: error.message };
    }
  }

  async backupAllCollections() {
    console.log('🚀 Starting Firebase backup process...');
    console.log(`📁 Backup location: ${this.backupPath}`);
    
    // List of collections to backup (add/remove based on your needs)
    const collections = [
      'users',
      'stores',
      'orders',
      'customers',
      'menu',
      'categories',
      'combos',
      'toppings',
      'sauces',
      'discountCodes',
      'deliveryCharges',
      'inventory',
      'jobStatus',
      'marketing',
      'roleManagement'
    ];
    
    const results = [];
    const startTime = Date.now();
    
    for (const collection of collections) {
      const result = await this.backupCollection(collection);
      results.push(result);
      
      // Small delay to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Generate backup summary
    const summary = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      totalCollections: collections.length,
      successfulCollections: results.filter(r => !r.error).length,
      failedCollections: results.filter(r => r.error).length,
      results: results
    };
    
    const summaryPath = path.join(this.backupPath, 'backup-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n📊 Backup Summary:');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Successful: ${summary.successfulCollections}`);
    console.log(`❌ Failed: ${summary.failedCollections}`);
    console.log(`📁 Backup location: ${this.backupPath}`);
    
    return summary;
  }

  async uploadToCloudStorage(bucketName = 'right-wingers-backups') {
    try {
      console.log(`☁️  Uploading backup to Cloud Storage bucket: ${bucketName}`);
      
      const bucket = storage.bucket(bucketName);
      const files = fs.readdirSync(this.backupPath);
      
      for (const file of files) {
        const filePath = path.join(this.backupPath, file);
        const destination = `backups/${this.timestamp}/${file}`;
        
        await bucket.upload(filePath, {
          destination: destination,
          metadata: {
            contentType: 'application/json',
            metadata: {
              backupTimestamp: this.timestamp,
              originalFile: file
            }
          }
        });
        
        console.log(`✓ Uploaded: ${file} -> ${destination}`);
      }
      
      console.log('☁️  Cloud Storage upload completed successfully');
    } catch (error) {
      console.error('✗ Cloud Storage upload failed:', error.message);
    }
  }

  async cleanupOldBackups(maxAgeDays = 30) {
    try {
      console.log(`🧹 Cleaning up backups older than ${maxAgeDays} days...`);
      
      const backupDirs = fs.readdirSync(this.backupDir);
      const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
      
      for (const dir of backupDirs) {
        const dirPath = path.join(this.backupDir, dir);
        const stats = fs.statSync(dirPath);
        
        if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`🗑️  Removed old backup: ${dir}`);
        }
      }
    } catch (error) {
      console.error('✗ Cleanup failed:', error.message);
    }
  }
}

// Main execution function
async function runBackup() {
  const backupService = new FirebaseBackupService();
  
  try {
    // Run the backup
    const summary = await backupService.backupAllCollections();
    
    // Upload to Cloud Storage (optional)
    if (process.argv.includes('--upload')) {
      await backupService.uploadToCloudStorage();
    }
    
    // Cleanup old backups
    if (process.argv.includes('--cleanup')) {
      await backupService.cleanupOldBackups();
    }
    
    console.log('\n🎉 Backup process completed successfully!');
    
    // Exit with success code
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Backup process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBackup();
}

module.exports = FirebaseBackupService;
