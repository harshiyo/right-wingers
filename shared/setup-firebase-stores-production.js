const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Check if service account key file exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.log('❌ Error: serviceAccountKey.json not found!');
  console.log('📋 Please follow these steps:');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
  console.log('2. Select your "right-wingers" project');
  console.log('3. Go to Project Settings (gear icon)');
  console.log('4. Go to Service Accounts tab');
  console.log('5. Click "Generate new private key"');
  console.log('6. Download the JSON file');
  console.log('7. Rename it to "serviceAccountKey.json"');
  console.log('8. Place it in this directory: ' + __dirname);
  console.log('');
  console.log('Then run this script again.');
  process.exit(1);
}

// Load service account key
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK for production
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "right-wingers"
});

const db = admin.firestore();

const stores = [
  {
    id: 'store_001',
    name: 'Right Wingers - Hamilton',
    address: '1846 Main St W',
    city: 'Hamilton',
    province: 'ON',
    postalCode: 'L8S 4P7',
    phone: '(905) 777-9464',
    email: 'hamilton@rightwingers.com',
    timezone: 'America/Toronto',
    isActive: true,
    taxRate: 13,
    latitude: 43.252203,
    longitude: -79.940158,
    operatingHours: {
      monday: '3:30pm - 8:30pm',
      tuesday: '3:30pm - 10:30pm',
      wednesday: '3:30pm - 10:30pm',
      thursday: '3:30pm - 10:30pm',
      friday: '3:00pm - 11:30pm',
      saturday: '3:00pm - 10:30pm',
      sunday: '1:00pm - 8:30pm'
    }
  },
  {
    id: 'store_002',
    name: 'Right Wingers - Burlington',
    address: '2184 Mountain Grove Ave',
    city: 'Burlington',
    province: 'ON',
    postalCode: 'L7P 2J3',
    phone: '(905) 331-1944',
    email: 'burlington@rightwingers.com',
    timezone: 'America/Toronto',
    isActive: true,
    taxRate: 13,
    latitude: 43.367493,
    longitude: -79.826724,
    operatingHours: {
      monday: '11:00am - 10:00pm',
      tuesday: '11:00am - 11:00pm',
      wednesday: '11:00am - 11:00pm',
      thursday: '11:00am - 11:00pm',
      friday: '11:00am - 12:00am',
      saturday: '11:00am - 12:00am',
      sunday: '11:00am - 11:00pm'
    }
  },
  {
    id: 'store_003',
    name: 'Right Wingers - St. Catharines',
    address: '486 Grantham Ave',
    city: 'St. Catharines',
    province: 'ON',
    postalCode: 'L2M 6W2',
    phone: '(905) 397-9090',
    email: 'stcatharines@rightwingers.com',
    timezone: 'America/Toronto',
    isActive: true,
    taxRate: 13,
    latitude: 43.1998264,
    longitude: -79.2212251,
    operatingHours: {
      monday: '11:00am - 9:00pm',
      tuesday: '11:00am - 10:00pm',
      wednesday: '11:00am - 10:00pm',
      thursday: '11:00am - 10:00pm',
      friday: '11:00am - 11:00pm',
      saturday: '11:00am - 11:00pm',
      sunday: '12:00pm - 10:00pm'
    }
  },
  {
    id: 'store_004',
    name: 'Right Wingers - Oakville',
    address: '601 Ford Dr',
    city: 'Oakville',
    province: 'ON',
    postalCode: 'L6J 7Z6',
    phone: '(905) 337-9596',
    email: 'oakville@rightwingers.com',
    timezone: 'America/Toronto',
    isActive: true,
    taxRate: 13,
    latitude: 43.488808,
    longitude: -79.650518,
    operatingHours: {
      monday: '11:00am - 10:00pm',
      tuesday: '11:00am - 11:00pm',
      wednesday: '11:00am - 11:00pm',
      thursday: '11:00am - 11:00pm',
      friday: '11:00am - 12:00am',
      saturday: '11:00am - 12:00am',
      sunday: '12:00pm - 11:00pm'
    }
  }
];

async function createStores() {
  console.log('🚀 Setting up Firebase stores in PRODUCTION database...');
  console.log('📡 Connecting to real Firebase project: right-wingers');
  console.log('✅ Using service account key for authentication');
  
  // First, check if stores already exist
  try {
    const storesSnapshot = await db.collection('stores').get();
    console.log(`📊 Found ${storesSnapshot.size} existing stores`);
    
    if (storesSnapshot.size > 0) {
      console.log('⚠️  Stores already exist in Firestore. Checking which ones need to be created...');
      const existingStoreIds = new Set(storesSnapshot.docs.map(doc => doc.id));
      
      const storesToCreate = stores.filter(store => !existingStoreIds.has(store.id));
      
      if (storesToCreate.length === 0) {
        console.log('✅ All required stores already exist in Firestore.');
        console.log('📋 Existing stores:');
        storesSnapshot.docs.forEach(doc => {
          const store = doc.data();
          console.log(`  - ${store.name} (${doc.id})`);
        });
        process.exit(0);
      }
      
      console.log(`📝 Need to create ${storesToCreate.length} new stores:`);
      storesToCreate.forEach(store => console.log(`  - ${store.name} (${store.id})`));
    }
    
  } catch (error) {
    console.error('❌ Error checking existing stores:', error);
  }

  for (const storeData of stores) {
    try {
      // Check if store already exists
      const storeDoc = await db.collection('stores').doc(storeData.id).get();
      
      if (storeDoc.exists) {
        console.log(`⏭️  Skipping ${storeData.name} - already exists`);
        continue;
      }
      
      // Create store in Firestore (production)
      await db.collection('stores').doc(storeData.id).set({
        ...storeData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Created store: ${storeData.name} (${storeData.id})`);

    } catch (error) {
      console.error(`❌ Error creating store ${storeData.name}:`, error);
    }
  }

  console.log('🎉 Firebase stores setup complete in PRODUCTION!');
  console.log('\n📋 Stores Created:');
  stores.forEach(store => {
    console.log(`${store.name} (${store.id}) - ${store.city}, ${store.province}`);
  });

  process.exit(0);
}

createStores().catch(console.error); 