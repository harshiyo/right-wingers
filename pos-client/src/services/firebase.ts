import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs, orderBy } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { Order } from './types';

const firebaseConfig = {
  projectId: "right-wingers",
  appId: "1:1009162860593:web:5ef281a73553f39bd63d10",
  storageBucket: "right-wingers.firebasestorage.app",
  apiKey: "AIzaSyD9_6YN7j3Ozk5jMuTtOzXXP5SZU9OEx8Q",
  authDomain: "right-wingers.firebaseapp.com",
  messagingSenderId: "1009162860593",
  measurementId: "G-LHYGWJBZ0Y"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators only if explicitly enabled via environment variable
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  try {
    // Connect to emulators if they're running
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    // Connected to Firebase emulators for POS Client
  } catch (error) {
    console.error("Error connecting POS Client to Firebase emulators:", error);
  }
} else {
  // Connected to real Firebase database for POS Client
}

// Utility to remove undefined fields from an object (shallow)
function removeUndefinedFields(obj: Record<string, any>) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

export async function writeLog({ type, message, user, ...extra }: { type: string; message: string; user?: string | null; [key: string]: any }) {
  try {
    const logData = removeUndefinedFields({
      type,
      message,
      user: user ?? undefined,
      ...extra,
      timestamp: serverTimestamp(),
    });
    await addDoc(collection(db, 'logs'), logData);
  } catch (error) {
    // Optionally log to console if Firestore write fails
    console.error('Failed to write log:', error);
  }
}

export function listenForOrders(storeId: string, onOrder: (order: Order) => void) {
  const q = query(
    collection(db, 'orders'),
    where('storeId', '==', storeId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        onOrder({ id: change.doc.id, ...change.doc.data() } as Order);
      }
    });
  });
}

export async function fetchOrdersSince(storeId: string, since: number): Promise<Order[]> {
  const q = query(
    collection(db, 'orders'),
    where('storeId', '==', storeId),
    where('createdAt', '>', since)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
} 