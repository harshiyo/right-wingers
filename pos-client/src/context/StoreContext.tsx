import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, writeLog } from '../services/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'master_admin' | 'store_admin' | 'employee';
  assignedStoreId?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  timezone: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  operatingHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

interface StoreContextType {
  currentStore: Store | null;
  currentUser: User | null;
  availableStores: Store[];
  switchStore: (storeId: string) => boolean;
  login: (user: User) => void;
  loginWithCredentials: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (resource: string, action: string, storeId?: string) => boolean;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch stores from Firestore
  const fetchStores = async (): Promise<Store[]> => {
    try {
      const storesRef = collection(db, 'stores');
      const storesQuery = query(storesRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(storesQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Store[];
    } catch (error) {
      console.error('Error fetching stores:', error);
      return [];
    }
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || 'Unknown User',
          email: userData.email || firebaseUser.email || '',
          phone: userData.phone || '',
          role: userData.role || 'employee',
          assignedStoreId: userData.assignedStoreId || undefined,
          isActive: userData.isActive !== false,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastLogin: userData.lastLogin?.toDate?.()?.toISOString() || undefined
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Initialize authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      
      try {
        if (firebaseUser) {
          // User is signed in
          const userProfile = await fetchUserProfile(firebaseUser);
          if (userProfile && userProfile.isActive) {
            // Update lastLogin in Firestore
            try {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
            } catch (e) {
              console.error('Failed to update lastLogin:', e);
              writeLog({ type: 'error', message: 'Failed to update lastLogin', user: firebaseUser.email, error: String(e) });
            }
            setCurrentUser(userProfile);
            // Removed: writeLog({ type: 'login', message: 'User logged in', user: userProfile.email });
            
            // Fetch stores
            const stores = await fetchStores();
            setAvailableStores(stores);
            
            // Set default store
            const defaultStore = getDefaultStoreForUser(userProfile, stores);
            if (defaultStore) {
              setCurrentStore(defaultStore);
              localStorage.setItem('pos_current_store_id', defaultStore.id);
            }
            
            // Store user in localStorage for persistence
            localStorage.setItem('pos_current_user', JSON.stringify(userProfile));
          } else {
            // User profile not found or inactive
            await signOut(auth);
            setCurrentUser(null);
            setCurrentStore(null);
            localStorage.removeItem('pos_current_user');
            localStorage.removeItem('pos_current_store_id');
            writeLog({ type: 'error', message: 'Inactive or missing user profile on login', user: firebaseUser.email });
          }
        } else {
          // User is signed out
          setCurrentUser(null);
          setCurrentStore(null);
          setAvailableStores([]);
          localStorage.removeItem('pos_current_user');
          localStorage.removeItem('pos_current_store_id');
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setCurrentUser(null);
        setCurrentStore(null);
        writeLog({ type: 'error', message: 'Error in auth state change', error: String(error) });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const getDefaultStoreForUser = (user: User, stores: Store[]): Store | null => {
    if (user.assignedStoreId) {
      const assignedStore = stores.find(s => s.id === user.assignedStoreId);
      if (assignedStore) return assignedStore;
    }
    
    // Fallback to first active store
    return stores.find(store => store.isActive) || null;
  };

  const loginWithCredentials = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      writeLog({ type: 'login', message: 'User logged in', user: email });
      return true; // Success will be handled by the auth state listener
    } catch (error) {
      console.error('Login error:', error);
      writeLog({ type: 'error', message: 'Login error', user: email, error: String(error) });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (user: User) => {
    // This method is for direct user object login (like from user selection dialog)
    // For Firebase auth, we'll primarily use loginWithCredentials
    setCurrentUser(user);
    localStorage.setItem('pos_current_user', JSON.stringify(user));

    // Fetch fresh stores data
    const stores = await fetchStores();
    setAvailableStores(stores);

    // Set default store based on user assignment
    const defaultStore = getDefaultStoreForUser(user, stores);
    if (defaultStore) {
      setCurrentStore(defaultStore);
      localStorage.setItem('pos_current_store_id', defaultStore.id);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear localStorage
      localStorage.removeItem('pos_current_user');
      localStorage.removeItem('pos_current_store_id');
      
      // Force a page reload to clear all state and navigate to login
      // This works in both development and production modes
      window.location.reload();
      
      writeLog({ type: 'logout', message: 'User logged out', user: (currentUser && currentUser.email) ? currentUser.email : undefined });
    } catch (error) {
      console.error('Logout error:', error);
      writeLog({ type: 'error', message: 'Logout error', user: (currentUser && currentUser.email) ? currentUser.email : undefined, error: String(error) });
    }
  };

  const switchStore = (storeId: string): boolean => {
    if (!currentUser) {
      return false;
    }

    const store = availableStores.find(s => s.id === storeId);
    if (!store) {
      return false;
    }

    setCurrentStore(store);
    localStorage.setItem('pos_current_store_id', storeId);
    return true;
  };

  const checkPermission = (_resource: string, _action: string, _storeId?: string): boolean => {
    if (!currentUser) {
      return false;
    }

    // Simple permission check for now
    return true;
  };

  const value: StoreContextType = {
    currentStore,
    currentUser,
    availableStores,
    switchStore,
    login,
    loginWithCredentials,
    logout,
    hasPermission: checkPermission,
    isLoading,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}; 