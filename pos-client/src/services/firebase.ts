import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs, orderBy, getDoc, doc, runTransaction, Transaction } from "firebase/firestore";
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

// Store-specific order number generation
export const generateStoreOrderNumber = async (
  storeId: string,
  isOnline: boolean
): Promise<string> => {
  try {
    console.log(`🔄 Generating order number for store: ${storeId}, isOnline: ${isOnline}`);
    
    // Get store information to determine prefix
    const storeDoc = await getDoc(doc(db, 'stores', storeId));
    if (!storeDoc.exists()) {
      console.error(`❌ Store not found: ${storeId}`);
      throw new Error(`Store not found: ${storeId}`);
    }

    const storeData = storeDoc.data();
    const storeName = storeData.name || '';
    const customPrefix = storeData.orderNumberPrefix;

    console.log(`📋 Store data: name="${storeName}", customPrefix="${customPrefix}"`);

    // Determine prefix based on store name or custom prefix
    let prefix = customPrefix;
    if (!prefix) {
      // Default prefixes based on store name
      if (storeName.includes('Hamilton')) prefix = 'HAM';
      else if (storeName.includes('Burlington')) prefix = 'BUR';
      else if (storeName.includes('St. Catharines') || storeName.includes('St Catharines')) prefix = 'STC';
      else if (storeName.includes('Oakville')) prefix = 'OAK';
      else {
        // Fallback: use first 3 letters of store name
        prefix = storeName.replace(/[^A-Z]/gi, '').substring(0, 3).toUpperCase();
      }
    }

    console.log(`🏷️ Determined prefix: ${prefix}`);

    // Add P for POS or O for Online
    const orderType = isOnline ? 'O' : 'P';
    const fullPrefix = `${prefix}${orderType}`;

    console.log(`🎯 Full prefix: ${fullPrefix}`);

    // Use store-specific counter
    const counterRef = doc(db, 'counters', `orders_${storeId}`);

    const newNumber = await runTransaction(db, async (transaction: Transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
      const newCount = currentCount + 1;
      
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      // Format: PREFIX + 4 digits (e.g., HAMP0001, HAMO0001)
      const orderNumber = `${fullPrefix}${String(newCount).padStart(4, '0')}`;
      console.log(`✅ Generated order number: ${orderNumber}`);
      return orderNumber;
    });

    return newNumber;
  } catch (error) {
    console.error('❌ Error generating store order number:', error);
    console.error('📊 Error details:', {
      storeId,
      isOnline,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
    // Fallback to timestamp-based number if offline
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const fallbackNumber = `FALL${timestamp % 1000}${randomSuffix}`;
    console.log(`🔄 Using fallback order number: ${fallbackNumber}`);
    return fallbackNumber;
  }
}; 