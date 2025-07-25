import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, collection, query, orderBy, getDocs, onSnapshot, where } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

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

// Connect to emulators in development
if (__DEV__) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("Connected to Firebase emulators for Mobile App");
  } catch (error) {
    console.error("Error connecting Mobile App to Firebase emulators:", error);
  }
}

// Types
export interface Category {
  id: string;
  name: string;
  icon: string;
  position: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  position: number;
  tileColor?: string;
  isCustomizable?: boolean;
  maxToppings?: number;
  maxSauces?: number;
  isSpecialtyPizza?: boolean;
  sizePricing?: {
    small: number;
    medium: number;
    large: number;
  };
  description?: string;
  isActive: boolean;
}

export interface Combo {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  imageUrl?: string;
  components: ComboComponent[];
  isActive: boolean;
}

export interface ComboComponent {
  type: 'pizza' | 'wings' | 'side' | 'drink';
  itemId: string;
  itemName: string;
  quantity: number;
  maxToppings?: number;
  maxSauces?: number;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  category?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isKeto?: boolean;
}

export interface Sauce {
  id: string;
  name: string;
  price?: number;
  isSpicy?: boolean;
  isVegan?: boolean;
}

// Service functions
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const q = query(
      collection(db, 'categories'),
      where('isActive', '==', true),
      orderBy('position')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const fetchMenuItems = async (categoryId?: string): Promise<MenuItem[]> => {
  try {
    let q = query(
      collection(db, 'menuItems'),
      where('isActive', '==', true),
      orderBy('position')
    );
    
    if (categoryId) {
      q = query(
        collection(db, 'menuItems'),
        where('isActive', '==', true),
        where('category', '==', categoryId),
        orderBy('position')
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }
};

export const fetchCombos = async (): Promise<Combo[]> => {
  try {
    const q = query(
      collection(db, 'combos'),
      where('isActive', '==', true),
      orderBy('basePrice')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Combo));
  } catch (error) {
    console.error('Error fetching combos:', error);
    return [];
  }
};

export const fetchToppings = async (): Promise<Topping[]> => {
  try {
    const q = query(collection(db, 'toppings'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topping));
  } catch (error) {
    console.error('Error fetching toppings:', error);
    return [];
  }
};

export const fetchSauces = async (): Promise<Sauce[]> => {
  try {
    const q = query(collection(db, 'sauces'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sauce));
  } catch (error) {
    console.error('Error fetching sauces:', error);
    return [];
  }
};

export const fetchFeaturedItems = async (): Promise<MenuItem[]> => {
  try {
    const q = query(
      collection(db, 'menuItems'),
      where('isActive', '==', true),
      where('isSpecialtyPizza', '==', true),
      orderBy('position')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
  } catch (error) {
    console.error('Error fetching featured items:', error);
    return [];
  }
}; 