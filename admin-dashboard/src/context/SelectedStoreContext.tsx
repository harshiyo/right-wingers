import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  // Add other store properties as needed
}

interface SelectedStoreContextType {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
}

const SelectedStoreContext = createContext<SelectedStoreContextType | undefined>(undefined);

export const SelectedStoreProvider = ({ children }: { children: ReactNode }) => {
  const [selectedStore, setSelectedStore] = useState<Store | null>(() => {
    const stored = localStorage.getItem('selectedStore');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (selectedStore) {
      localStorage.setItem('selectedStore', JSON.stringify(selectedStore));
    } else {
      localStorage.removeItem('selectedStore');
    }
  }, [selectedStore]);

  return (
    <SelectedStoreContext.Provider value={{ selectedStore, setSelectedStore }}>
      {children}
    </SelectedStoreContext.Provider>
  );
};

export const useSelectedStore = () => {
  const context = useContext(SelectedStoreContext);
  if (context === undefined) {
    throw new Error('useSelectedStore must be used within a SelectedStoreProvider');
  }
  return context;
}; 