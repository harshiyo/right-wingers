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

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "right-wingers"
});

const auth = admin.auth();
const db = admin.firestore();

const users = [
  {
    name: 'Master Admin',
    email: 'admin@rightwingers.com',
    phone: '+1 (905) 555-0100',
    role: 'master_admin',
    password: 'admin123',
    isActive: true
  },
  {
    name: 'John Smith',
    email: 'hamilton.manager@rightwingers.com',
    phone: '+1 (905) 777-9464',
    role: 'store_admin',
    assignedStoreId: 'store_001',
    password: 'hamilton123',
    isActive: true
  },
  {
    name: 'Sarah Johnson',
    email: 'burlington.manager@rightwingers.com',
    phone: '+1 (905) 331-1944',
    role: 'store_admin',
    assignedStoreId: 'store_002',
    password: 'burlington123',
    isActive: true
  },
  {
    name: 'Mike Davis',
    email: 'stcatharines.manager@rightwingers.com',
    phone: '+1 (905) 397-9090',
    role: 'store_admin',
    assignedStoreId: 'store_003',
    password: 'stcatharines123',
    isActive: true
  },
  {
    name: 'Emma Wilson',
    email: 'oakville.manager@rightwingers.com',
    phone: '+1 (905) 337-9596',
    role: 'store_admin',
    assignedStoreId: 'store_004',
    password: 'oakville123',
    isActive: true
  }
];

async function createUsers() {
  console.log('🚀 Setting up Firebase users in PRODUCTION database...');
  console.log('📡 Connecting to real Firebase project: right-wingers');
  console.log('✅ Using service account key for authentication');
  
  // First, check if users already exist
  try {
    const existingUsers = await auth.listUsers();
    console.log(`📊 Found ${existingUsers.users.length} existing users`);
    
    // Create a set of existing emails for quick lookup
    const existingEmails = new Set(existingUsers.users.map(user => user.email));
    
    // Filter out users that already exist
    const usersToCreate = users.filter(user => !existingEmails.has(user.email));
    
    if (usersToCreate.length === 0) {
      console.log('✅ All required users already exist in Firebase Auth.');
      console.log('📋 Existing users:');
      existingUsers.users.forEach(user => {
        console.log(`  - ${user.email} (${user.uid})`);
      });
      process.exit(0);
    }
    
    console.log(`📝 Need to create ${usersToCreate.length} new users:`);
    usersToCreate.forEach(user => console.log(`  - ${user.email}`));
    
  } catch (error) {
    console.error('❌ Error checking existing users:', error);
    return;
  }

  for (const userData of users) {
    // Skip if user already exists
    try {
      const existingUser = await auth.getUserByEmail(userData.email);
      console.log(`⏭️  Skipping ${userData.email} - already exists`);
      continue;
    } catch (error) {
      // User doesn't exist, create them
    }
    
    try {
      // Create user in Firebase Authentication (production)
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
        disabled: false
      });

      console.log(`✅ Created Firebase Auth user: ${userData.email} (${userRecord.uid})`);

      // Create user profile in Firestore (production)
      const userProfile = {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: null
      };

      // Only add assignedStoreId if it exists (not for master_admin)
      if (userData.assignedStoreId) {
        userProfile.assignedStoreId = userData.assignedStoreId;
      }

      await db.collection('users').doc(userRecord.uid).set(userProfile);
      console.log(`✅ Created Firestore profile for: ${userData.name} (${userRecord.uid})`);

    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error);
    }
  }

  console.log('🎉 Firebase user setup complete in PRODUCTION!');
  console.log('\n📋 User Credentials (for production use):');
  users.forEach(user => {
    console.log(`${user.name} (${user.role}): ${user.email} / ${user.password}`);
  });
  
  process.exit(0);
}

createUsers().catch(console.error); 