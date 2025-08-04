import { collection, addDoc, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    lat?: number;
    lon?: number;
  };
  distanceFromStore?: number; // Distance in kilometers
  orderCount: number;
  lastOrderDate: string;
  storeId: string; // Store where customer was created/primarily shops
  notes?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedDate?: string;
  blockedBy?: string;
}

export const dummyCustomers: Customer[] = [
  {
    id: '1',
    phone: '6471234567',
    name: 'Glenda A.',
    address: {
      street: '123 Queen St',
      city: 'Oakville',
      postalCode: 'L6K 2G1',
    },
    orderCount: 12,
    lastOrderDate: '2024-06-12',
    storeId: 'store_001', // Downtown store
  },
  {
    id: '2',
    phone: '4169876543',
    name: 'Michael Johnson',
    address: {
      street: '456 Oak Ave',
      city: 'Toronto',
      postalCode: 'M5V 3A1',
    },
    orderCount: 8,
    lastOrderDate: '2024-05-28',
    storeId: 'store_002', // Westside store
  },
  {
    id: '3',
    phone: '9054567890',
    name: 'Sarah Wilson',
    address: {
      street: '789 Maple Dr',
      city: 'Burlington',
      postalCode: 'L7R 2K5',
    },
    orderCount: 15,
    lastOrderDate: '2024-06-15',
    storeId: 'store_001', // Downtown store
  },
  {
    id: '4',
    phone: '5191234567',
    name: 'David Brown',
    address: {
      street: '321 Pine St',
      city: 'London',
      postalCode: 'N6A 1B2',
    },
    orderCount: 3,
    lastOrderDate: '2024-04-20',
    storeId: 'store_003', // University store
  },
];

// Save new customer to Firebase
export const saveCustomerToFirebase = async (customerData: Omit<Customer, 'id'>) => {
  try {
    // Import Firebase functions dynamically to avoid import issues
    const { collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    
    const docRef = await addDoc(collection(db, 'customers'), {
      ...customerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Customer saved to Firebase:', docRef.id);
    
    return {
      ...customerData,
      id: docRef.id
    };
  } catch (error) {
    console.error('❌ Error saving customer to Firebase:', error);
    throw error;
  }
};

// Update existing customer in Firebase
export const updateCustomerInFirebase = async (customerId: string, updates: Partial<Customer>) => {
  try {
    // Import Firebase functions dynamically to avoid import issues
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    
    const customerRef = doc(db, 'customers', customerId);
    await updateDoc(customerRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Customer updated in Firebase:', customerId);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating customer in Firebase:', error);
    throw error;
  }
};

// Calculate driving distance between two coordinates using Geoapify Routing API
export const calculateDrivingDistance = async (lat1: number, lon1: number, lat2: number, lon2: number): Promise<number | null> => {
  try {
    const API_KEY = "34fdfa74334e4230b1153e219ddf8dcd";
    const waypoints = `${lat1},${lon1}|${lat2},${lon2}`;
    const params = new URLSearchParams({
      waypoints: waypoints,
      mode: 'drive',
      apiKey: API_KEY
    });

    const response = await fetch(`https://api.geoapify.com/v1/routing?${params}`);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const distance = feature.properties.distance; // Distance in meters
      const distanceKm = distance / 1000; // Convert to kilometers
      return distanceKm;
    }
    return null;
  } catch (error) {
    console.error('Error calculating driving distance:', error);
    return null;
  }
};

// Update customer address specifically
export const updateCustomerAddress = async (phone: string, address: { street: string; city: string; postalCode: string; lat?: number; lon?: number }, distanceFromStore?: number) => {
  try {
    // Find customer by phone first
    const customer = await findCustomerByPhone(phone);
    if (!customer) {
      console.log('Customer not found, cannot update address');
      return false;
    }

    // Prepare update data
    const updateData: any = { address };
    
    // Include distance if provided
    if (distanceFromStore !== undefined) {
      updateData.distanceFromStore = distanceFromStore;
    }

    // Update the customer's address and distance
    await updateCustomerInFirebase(customer.id, updateData);
    console.log('✅ Customer address and distance updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating customer address:', error);
    return false;
  }
};

// Get all customers from Firebase (with fallback to dummy data)
export const getAllCustomersFromFirebase = async (storeId?: string): Promise<Customer[]> => {
  try {
    // Import Firebase functions dynamically
    const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    
    let q;
    if (storeId) {
      q = query(
        collection(db, 'customers'),
        where('storeId', '==', storeId),
        orderBy('name')
      );
    } else {
      q = query(collection(db, 'customers'), orderBy('name'));
    }
    
    const querySnapshot = await getDocs(q);
    const firebaseCustomers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Customer));

    // Combine Firebase customers with dummy data for development
    const allCustomers = [...firebaseCustomers, ...dummyCustomers];
    
    // Remove duplicates based on phone number (prioritize Firebase data)
    const uniqueCustomers = allCustomers.reduce((acc: Customer[], customer) => {
      const existingIndex = acc.findIndex(c => c.phone === customer.phone);
      if (existingIndex === -1) {
        acc.push(customer);
      } else if (customer.id.length > 10) { // Firebase IDs are longer
        acc[existingIndex] = customer; // Replace with Firebase version
      }
      return acc;
    }, []);

    return uniqueCustomers;
  } catch (error) {
    console.error('❌ Error fetching customers from Firebase, using dummy data:', error);
    return dummyCustomers;
  }
};

export const findCustomerByPhone = async (phone: string): Promise<Customer | undefined> => {
  const cleanedPhone = phone.replace(/\D/g, '');
  
  try {
    // Import Firebase functions dynamically
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    
    // Try Firebase first
    const q = query(
      collection(db, 'customers'),
      where('phone', '==', cleanedPhone)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Customer;
    }
    
    // Fallback to dummy data
    return dummyCustomers.find((customer) => customer.phone === cleanedPhone);
  } catch (error) {
    console.error('❌ Error finding customer by phone:', error);
    return dummyCustomers.find((customer) => customer.phone === cleanedPhone);
  }
};

export const searchCustomers = async (query: string, storeId?: string): Promise<Customer[]> => {
  if (!query || query.length < 3) return [];
  
  const cleanedQuery = query.replace(/\D/g, '');
  
  try {
    // Get all customers (this could be optimized with better Firestore queries)
    const allCustomers = await getAllCustomersFromFirebase(storeId);
    
    return allCustomers.filter((customer) => {
      // Filter by store if provided and not already filtered
      if (storeId && customer.storeId !== storeId) return false;
      
      // Phone number matches
      if (customer.phone.includes(cleanedQuery)) return true;
      
      // Last 4 digits match
      if (cleanedQuery.length >= 4 && customer.phone.endsWith(cleanedQuery)) return true;
      
      // Area code match
      if (cleanedQuery.length >= 3 && customer.phone.startsWith(cleanedQuery)) return true;
      
      // Name match
      if (customer.name.toLowerCase().includes(query.toLowerCase())) return true;
      
      return false;
    });
  } catch (error) {
    console.error('❌ Error searching customers:', error);
    // Fallback to dummy data search
    let filteredCustomers = dummyCustomers;
    
    if (storeId) {
      filteredCustomers = dummyCustomers.filter(customer => customer.storeId === storeId);
    }
    
    return filteredCustomers.filter((customer) => {
      if (customer.phone.includes(cleanedQuery)) return true;
      if (cleanedQuery.length >= 4 && customer.phone.endsWith(cleanedQuery)) return true;
      if (cleanedQuery.length >= 3 && customer.phone.startsWith(cleanedQuery)) return true;
      if (customer.name.toLowerCase().includes(query.toLowerCase())) return true;
      return false;
    });
  }
};

export const getCustomersByStore = (storeId: string): Customer[] => {
  return dummyCustomers.filter(customer => customer.storeId === storeId);
}; 