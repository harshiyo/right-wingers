import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'master_admin' | 'store_admin';
  assignedStoreId?: string; // undefined for master_admin, specific store ID for store_admin
}

// Create a cache for user data
const userCache = new Map<string, User>();

export const useAuth = () => {
  const [firebaseUser, loading, error] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      if (!firebaseUser) {
        setIsUserLoading(false);
        setCurrentUser(null);
        return;
      }

      // Check cache first
      const cachedUser = userCache.get(firebaseUser.uid);
      if (cachedUser) {
        setCurrentUser(cachedUser);
        setIsUserLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && isMounted) {
          const userData = userDoc.data();
          const user: User = {
            id: firebaseUser.uid,
            name: userData.name || firebaseUser.displayName || 'Unknown User',
            email: userData.email || firebaseUser.email || '',
            role: userData.role || 'store_admin',
            assignedStoreId: userData.assignedStoreId || undefined
          };
          
          // Cache the user data
          userCache.set(firebaseUser.uid, user);
          setCurrentUser(user);
        } else if (isMounted) {
          console.error('User profile not found in Firestore');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        if (isMounted) {
          setCurrentUser(null);
        }
      }
      
      if (isMounted) {
        setIsUserLoading(false);
      }
    };

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [firebaseUser]);

  // Clear cache when user logs out
  useEffect(() => {
    if (!firebaseUser && !loading) {
      userCache.clear();
    }
  }, [firebaseUser, loading]);

  return {
    currentUser,
    isAuthenticated: !!firebaseUser && !!currentUser,
    loading: loading || isUserLoading,
    error
  };
};

export const stores = [
  { id: 'store_001', name: 'Hamilton', address: '1846 Main St W, Hamilton, ON L8S 4P7', phone: '(905) 777-9464' },
  { id: 'store_002', name: 'Burlington', address: '2184 Mountain Grove Ave, Burlington, ON L2P 2J3', phone: '(905) 331-1944' },
  { id: 'store_003', name: 'St. Catharines', address: '486 Grantham Ave, St. Catharines, ON L2M 6W2', phone: '(905) 397-9090' },
  { id: 'store_004', name: 'Oakville', address: '601 Ford Dr, Oakville, ON L6J 7Z6', phone: '(905) 337-9596' }
];

export type { User }; 