const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for EMULATOR use
admin.initializeApp({
  projectId: "right-wingers"
});

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

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
  console.log('🚀 Setting up Firebase users in EMULATOR...');
  console.log('📡 Connecting to Auth Emulator: localhost:9099');
  console.log('📡 Connecting to Firestore Emulator: localhost:8080');
  
  // First, delete all existing users and documents
  try {
    const existingUsers = await auth.listUsers();
    for (const user of existingUsers.users) {
      await auth.deleteUser(user.uid);
      await db.collection('users').doc(user.uid).delete();
    }
    console.log('🗑️  Cleared existing users');
  } catch (error) {
    if (error.code !== 'auth/invalid-argument') {
      console.error('❌ Error clearing users:', error);
    }
  }

  for (const userData of users) {
    try {
      // Create user in Firebase Authentication (emulator)
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
        disabled: false
      });

      console.log(`✅ Created Firebase Auth user: ${userData.email} (${userRecord.uid})`);

      // Create user profile in Firestore (emulator)
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

  console.log('🎉 Firebase user setup complete in EMULATOR!');
  console.log('\n📋 User Credentials (for emulator use):');
  users.forEach(user => {
    console.log(`${user.name} (${user.role}): ${user.email} / ${user.password}`);
  });
  
  process.exit(0);
}

createUsers().catch(console.error); 