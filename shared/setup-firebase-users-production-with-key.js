const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK for production using service account key
// Place your service account key JSON file in the shared directory
// and name it 'serviceAccountKey.json'
const serviceAccount = require('./serviceAccountKey.json');

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
  
  // First, check if users already exist
  try {
    const existingUsers = await auth.listUsers();
    console.log(`📊 Found ${existingUsers.users.length} existing users`);
    
    if (existingUsers.users.length > 0) {
      console.log('⚠️  Users already exist in Firebase Auth. Skipping user creation.');
      console.log('📋 Existing users:');
      existingUsers.users.forEach(user => {
        console.log(`  - ${user.email} (${user.uid})`);
      });
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error checking existing users:', error);
  }

  for (const userData of users) {
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