import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD9_6YN7j3Ozk5jMuTtOzXXP5SZU9OEx8Q",
  authDomain: "right-wingers.firebaseapp.com",
  projectId: "right-wingers",
  storageBucket: "right-wingers.firebasestorage.app",
  messagingSenderId: "1009162860593",
  appId: "1:1009162860593:web:5ef281a73553f39bd63d10",
  measurementId: "G-LHYGWJBZ0Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators only if explicitly enabled via environment variable
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.error('Error connecting to Firebase emulators:', error);
  }
} else {
  console.log('Connected to real Firebase database');
} 