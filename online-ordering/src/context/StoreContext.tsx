import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

// Types
interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  operatingHours: {
    day: string;
    open: string;
    close: string;
  }[];
  isActive: boolean;
}

interface StoreContextType {
  stores: Store[];
  selectedStore: Store | null;
  loading: boolean;
  error: string | null;
  selectStore: (storeId: string) => void;
  findNearestStore: (latitude: number, longitude: number) => Promise<Store | null>;
  clearSelectedStore: () => void;
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Create context
const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Provider component
export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch stores and initialize selected store
  useEffect(() => {
    async function initializeStores() {
      try {
        // Fetch stores
        const storesQuery = query(
          collection(db, 'stores'),
          where('isActive', '==', true)
        );
        
        const querySnapshot = await getDocs(storesQuery);
        const storesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Store[];
        
        setStores(storesData);

        // Try to restore selected store
        const savedStoreId = localStorage.getItem('selectedStoreId');
        if (savedStoreId) {
          const savedStore = storesData.find(store => store.id === savedStoreId);
          if (savedStore) {
            setSelectedStore(savedStore);
          }
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching stores:', err);
        setError('Failed to load stores. Please try again later.');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }

    initializeStores();
  }, []);

  const selectStore = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setSelectedStore(store);
      localStorage.setItem('selectedStoreId', storeId);
    }
  };

  const clearSelectedStore = () => {
    setSelectedStore(null);
    localStorage.removeItem('selectedStoreId');
  };

  const findNearestStore = async (latitude: number, longitude: number): Promise<Store | null> => {
    if (stores.length === 0) return null;

    // Calculate distances to all stores
    const storesWithDistance = stores.map(store => ({
      ...store,
      distance: calculateDistance(latitude, longitude, store.latitude, store.longitude)
    }));

    // Sort by distance
    const sortedStores = storesWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Return the nearest store
    return sortedStores[0];
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStore,
        loading: loading || !initialized,
        error,
        selectStore,
        findNearestStore,
        clearSelectedStore
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

// Custom hook to use store context
export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
} 