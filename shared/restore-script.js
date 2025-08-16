const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'right-wingers'
});

const db = admin.firestore();

class FirebaseRestoreService {
  constructor() {
    this.backupDir = path.join(__dirname, 'backups');
  }

  async listAvailableBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        console.log('No backup directory found');
        return [];
      }

      const backupDirs = fs.readdirSync(this.backupDir)
        .filter(dir => {
          const dirPath = path.join(this.backupDir, dir);
          return fs.statSync(dirPath).isDirectory();
        })
        .sort((a, b) => {
          // Sort by timestamp (newest first)
          return new Date(b) - new Date(a);
        });

      return backupDirs;
    } catch (error) {
      console.error('Error listing backups:', error.message);
      return [];
    }
  }

  async restoreCollection(backupPath, collectionName, options = {}) {
    const { dryRun = false, overwrite = false, batchSize = 500 } = options;
    
    console.log(`🔄 Restoring collection: ${collectionName}`);
    
    try {
      const filePath = path.join(backupPath, `${collectionName}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  No backup file found for ${collectionName}`);
        return { collection: collectionName, status: 'skipped', reason: 'no backup file' };
      }

      const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const documents = backupData.documents || [];
      
      if (documents.length === 0) {
        console.log(`⚠️  No documents found in ${collectionName} backup`);
        return { collection: collectionName, status: 'skipped', reason: 'no documents' };
      }

      console.log(`📄 Found ${documents.length} documents to restore`);

      if (dryRun) {
        console.log(`🔍 DRY RUN: Would restore ${documents.length} documents to ${collectionName}`);
        return { collection: collectionName, status: 'dry-run', count: documents.length };
      }

      // Check if collection exists and has data
      if (!overwrite) {
        const existingDocs = await db.collection(collectionName).limit(1).get();
        if (!existingDocs.empty) {
          console.log(`⚠️  Collection ${collectionName} already has data. Use --overwrite to force restore.`);
          return { collection: collectionName, status: 'skipped', reason: 'collection has existing data' };
        }
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process documents in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = documents.slice(i, i + batchSize);
        
        for (const docData of batchDocs) {
                     try {
             const docRef = db.collection(collectionName).doc(docData.id);
             
             // Extract the actual document data from the backup structure
             // The backup structure now has: { id, field1, field2, ..., createTime, updateTime }
             // We want to restore all fields except the metadata fields
             const { id, createTime, updateTime, ...documentData } = docData;
             
             // Handle timestamp fields
             if (documentData.timestamp) {
               documentData.timestamp = admin.firestore.Timestamp.fromDate(new Date(documentData.timestamp));
             }
             if (documentData.createdAt) {
               documentData.createdAt = admin.firestore.Timestamp.fromDate(new Date(documentData.createdAt));
             }
             if (documentData.updatedAt) {
               documentData.updatedAt = admin.firestore.Timestamp.fromDate(new Date(documentData.updatedAt));
             }
             if (documentData.lastOrderDate) {
               documentData.lastOrderDate = admin.firestore.Timestamp.fromDate(new Date(documentData.lastOrderDate));
             }

             batch.set(docRef, documentData);
          } catch (error) {
            errorCount++;
            errors.push({ documentId: docData.id, error: error.message });
          }
        }

        try {
          await batch.commit();
          successCount += batchDocs.length;
          console.log(`✓ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
        } catch (error) {
          console.error(`✗ Batch commit failed:`, error.message);
          errorCount += batchDocs.length;
        }

        // Small delay to avoid overwhelming Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Restored ${successCount} documents to ${collectionName}`);
      if (errorCount > 0) {
        console.log(`❌ Failed to restore ${errorCount} documents`);
      }

      return {
        collection: collectionName,
        status: 'completed',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error(`✗ Error restoring ${collectionName}:`, error.message);
      return { collection: collectionName, status: 'error', error: error.message };
    }
  }

  async restoreFromBackup(backupTimestamp, options = {}) {
    const { collections = [], dryRun = false, overwrite = false } = options;
    
    console.log('🚀 Starting Firebase restore process...');
    console.log(`📁 Backup timestamp: ${backupTimestamp}`);
    console.log(`🔍 Dry run: ${dryRun ? 'Yes' : 'No'}`);
    console.log(`⚡ Overwrite: ${overwrite ? 'Yes' : 'No'}`);
    
    const backupPath = path.join(this.backupDir, backupTimestamp);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup directory not found: ${backupTimestamp}`);
    }

    // Read backup summary to get available collections
    const summaryPath = path.join(backupPath, 'backup-summary.json');
    let availableCollections = [];
    
    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      availableCollections = summary.results
        .filter(r => !r.error)
        .map(r => r.collection);
    } else {
      // Fallback: scan directory for JSON files
      const files = fs.readdirSync(backupPath);
      availableCollections = files
        .filter(file => file.endsWith('.json') && file !== 'backup-summary.json')
        .map(file => file.replace('.json', ''));
    }

    // Filter collections if specific ones requested
    const collectionsToRestore = collections.length > 0 
      ? availableCollections.filter(col => collections.includes(col))
      : availableCollections;

    console.log(`📋 Available collections: ${availableCollections.join(', ')}`);
    console.log(`🎯 Collections to restore: ${collectionsToRestore.join(', ')}`);

    if (collectionsToRestore.length === 0) {
      console.log('⚠️  No collections to restore');
      return { status: 'no-collections' };
    }

    const results = [];
    const startTime = Date.now();

    for (const collection of collectionsToRestore) {
      const result = await this.restoreCollection(backupPath, collection, { dryRun, overwrite });
      results.push(result);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Generate restore summary
    const summary = {
      timestamp: new Date().toISOString(),
      backupTimestamp,
      duration: `${duration}s`,
      totalCollections: collectionsToRestore.length,
      successfulCollections: results.filter(r => r.status === 'completed').length,
      skippedCollections: results.filter(r => r.status === 'skipped').length,
      failedCollections: results.filter(r => r.status === 'error').length,
      dryRun,
      results
    };

    console.log('\n📊 Restore Summary:');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Successful: ${summary.successfulCollections}`);
    console.log(`⏭️  Skipped: ${summary.skippedCollections}`);
    console.log(`❌ Failed: ${summary.failedCollections}`);

    return summary;
  }

  async restoreLatestBackup(options = {}) {
    const backups = await this.listAvailableBackups();
    
    if (backups.length === 0) {
      throw new Error('No backups found');
    }

    const latestBackup = backups[0];
    console.log(`🎯 Using latest backup: ${latestBackup}`);
    
    return await this.restoreFromBackup(latestBackup, options);
  }
}

// Main execution function
async function runRestore() {
  const restoreService = new FirebaseRestoreService();
  
  try {
    const args = process.argv.slice(2);
    const options = {
      dryRun: args.includes('--dry-run'),
      overwrite: args.includes('--overwrite'),
      collections: []
    };

    // Extract collection names if specified
    const collectionIndex = args.indexOf('--collections');
    if (collectionIndex !== -1 && args[collectionIndex + 1]) {
      options.collections = args[collectionIndex + 1].split(',');
    }

    // Extract backup timestamp if specified
    const timestampIndex = args.indexOf('--timestamp');
    let backupTimestamp;
    if (timestampIndex !== -1 && args[timestampIndex + 1]) {
      backupTimestamp = args[timestampIndex + 1];
    }

    if (backupTimestamp) {
      // Restore from specific backup
      await restoreService.restoreFromBackup(backupTimestamp, options);
    } else {
      // Restore from latest backup
      await restoreService.restoreLatestBackup(options);
    }

    console.log('\n🎉 Restore process completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Restore process failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runRestore();
}

module.exports = FirebaseRestoreService;
