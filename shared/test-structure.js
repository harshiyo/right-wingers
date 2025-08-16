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

async function testStructure() {
  try {
    console.log('🔍 Testing document structure...');
    
    // Get a sample customer document
    const customerSnapshot = await db.collection('customers').limit(1).get();
    
    if (customerSnapshot.empty) {
      console.log('No customers found');
      return;
    }
    
    const customerDoc = customerSnapshot.docs[0];
    console.log('\n📄 Original Firebase document structure:');
    console.log('Document ID:', customerDoc.id);
    console.log('Document data:', JSON.stringify(customerDoc.data(), null, 2));
    
    // Simulate the backup structure
    const backupStructure = {
      id: customerDoc.id,
      ...customerDoc.data(), // Spread the data directly
      createTime: customerDoc.createTime?.toDate?.()?.toISOString(),
      updateTime: customerDoc.updateTime?.toDate?.()?.toISOString()
    };
    
    console.log('\n💾 Backup structure (what gets saved to file):');
    console.log(JSON.stringify(backupStructure, null, 2));
    
    // Simulate the restore structure
    const { id, createTime, updateTime, ...restoredData } = backupStructure;
    
    console.log('\n🔄 Restored structure (what gets put back in Firebase):');
    console.log(JSON.stringify(restoredData, null, 2));
    
    console.log('\n✅ Structure test completed!');
    
  } catch (error) {
    console.error('❌ Error testing structure:', error.message);
  }
}

// Run the test
testStructure().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
