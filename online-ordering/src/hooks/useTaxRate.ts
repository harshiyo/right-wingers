import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useStore } from '../context/StoreContext';

export const useTaxRate = () => {
  const [taxRate, setTaxRate] = useState(0.13); // Default to 13%
  const { selectedStore } = useStore();

  useEffect(() => {
    const loadTaxRate = async () => {
      if (!selectedStore?.id) return;
      
      try {
        const storeDoc = await getDoc(doc(db, 'stores', selectedStore.id));
        const storeTaxRate = storeDoc.data()?.taxRate;
        if (storeTaxRate) {
          setTaxRate(storeTaxRate / 100); // Convert from percentage to decimal
        }
      } catch (error) {
        console.error('Error loading tax rate:', error);
      }
    };

    loadTaxRate();
  }, [selectedStore?.id]);

  return taxRate;
}; 