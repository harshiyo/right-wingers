import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useSelectedStore } from '../context/SelectedStoreContext';

interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

export default function StoreSelector() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedStore, setSelectedStore } = useSelectedStore();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const storesSnapshot = await getDocs(collection(db, 'stores'));
        const storesData = storesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Store[];
        setStores(storesData);
        
        // If there's only one store, select it automatically
        if (storesData.length === 1 && !selectedStore) {
          setSelectedStore(storesData[0]);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [selectedStore, setSelectedStore]);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-10 rounded-lg w-full"></div>;
  }

  return (
    <div className="w-full max-w-md">
      <select
        value={selectedStore?.id || ''}
        onChange={(e) => {
          const store = stores.find(s => s.id === e.target.value);
          setSelectedStore(store || null);
        }}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        <option value="">Select a store</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name} - {store.city}, {store.state}
          </option>
        ))}
      </select>
    </div>
  );
} 