import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { offlineSync } from '../services/offlineSync';

export function useMenuCache(storeId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function cacheMenuData() {
      if (!storeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Wait a moment for database initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        if (navigator.onLine) {
          // Fetch all menu-related data in parallel
          const [menuSnapshot, toppingsSnapshot, saucesSnapshot, categoriesSnapshot, combosSnapshot] = await Promise.all([
            getDocs(collection(db, 'menuItems')),
            getDocs(collection(db, 'toppings')),
            getDocs(collection(db, 'sauces')),
            getDocs(collection(db, 'categories')),
            getDocs(collection(db, 'combos')),
          ]);

          if (isCancelled) return;

          // Convert to arrays
          const menuItems = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const toppings = toppingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const sauces = saucesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const combos = combosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Cache everything
          await Promise.all([
            offlineSync.cacheMenuData(storeId, menuItems),
            offlineSync.cacheToppingsData(toppings),
            offlineSync.cacheSaucesData(sauces),
            offlineSync.cacheCategoriesData(categories),
            offlineSync.cacheCombosData(combos),
          ]);

        } else {
          // Using cached data
        }

      } catch (err) {
        console.error('Failed to cache menu data:', err);
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load menu data');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    cacheMenuData();

    return () => {
      isCancelled = true;
    };
  }, [storeId]);

  return { isLoading, error };
} 