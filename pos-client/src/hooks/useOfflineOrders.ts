import { useState } from 'react';
import { offlineSync } from '../services/offlineSync';
import { useStore } from '../context/StoreContext';
import { collection, addDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface OfflineOrder {
  id: string;
  storeId: string;
  orderNumber: string;
  customerId?: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  store: {
    id: string;
    name: string;
    address?: string;
  };
  items: any[];
  total: number;
  orderType: 'pickup' | 'delivery' | 'dine-in';
  status: 'pending' | 'synced' | 'failed';
  timestamp: number;
  offline: boolean;
  deliveryDetails?: any;
  pickupDetails?: any;
  discounts?: Array<{
    id: string;
    name: string;
    amount: number;
    type: 'percentage' | 'fixed';
  }>;
  discountTotal?: number;
}

// Helper function to sanitize data for Firebase
const sanitizeForFirebase = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirebase).filter(item => item !== null && item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined && value !== null) {
        sanitized[key] = sanitizeForFirebase(value);
      }
    });
    return sanitized;
  }
  
  return obj;
};

const generateOrderNumber = async (isOnline: boolean): Promise<string> => {
  try {
    const counterRef = doc(db, 'counters', 'orders');
    
    const newNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
      const newCount = currentCount + 1;
      
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      // Format: RWP (Roti Way POS) or RWO (Roti Way Online) + 6 digits
      const prefix = isOnline ? 'RWO' : 'RWP';
      return `${prefix}${String(newCount).padStart(6, '0')}`;
    });
    
    return newNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to timestamp-based number if offline
    const timestamp = Date.now();
    return `RWP${timestamp}`;
  }
};

export const useOfflineOrders = () => {
  const [orders] = useState<OfflineOrder[]>([]);
  const [isLoading] = useState(false);
  const { currentStore } = useStore();

  const createOrder = async (orderData: Omit<OfflineOrder, 'id' | 'storeId' | 'status' | 'timestamp' | 'offline'>): Promise<string> => {
    if (!currentStore?.id) {
      throw new Error('No store selected');
    }

    try {
      const isOffline = !navigator.onLine;
      
      // Generate order number
      const orderNumber = await generateOrderNumber(false);
      
      // Sanitize the order data first
      const sanitizedOrderData = sanitizeForFirebase({
        ...orderData,
        orderNumber,
        customerInfo: {
          name: orderData.customerInfo?.name || 'Guest',
          phone: orderData.customerInfo?.phone || '',
          ...(orderData.customerInfo?.email && { email: orderData.customerInfo.email }),
          ...(orderData.customerInfo?.address && { address: orderData.customerInfo.address }),
        },
        // Add store information
        store: {
          id: currentStore.id,
          name: currentStore.name,
          address: currentStore.address,
        },
        // Add discount tracking
        discounts: orderData.discounts || [],
        discountTotal: orderData.discountTotal || 0,
      });
      
      if (isOffline) {
        const orderId = await offlineSync.saveOrderOffline(sanitizedOrderData, currentStore.id);
        return orderId;
      } else {
        try {
          const firestoreOrder = {
            ...sanitizedOrderData,
            storeId: currentStore.id,
            timestamp: Date.now(),
            source: 'pos', // Identify as POS order
            status: 'pending',
            createdAt: Date.now(),
          };

          const docRef = await addDoc(collection(db, 'orders'), firestoreOrder);
          return docRef.id;
        } catch (error) {
          console.warn('Failed to save online, saving offline instead:', error);
          const orderId = await offlineSync.saveOrderOffline(sanitizedOrderData, currentStore.id);
          return orderId;
        }
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  };

  return {
    orders,
    isLoading,
    createOrder,
    getOrderById: () => undefined,
    getPendingOrders: () => [],
    getSyncedOrders: () => [],
    refreshOrders: () => {},
  };
};

// Simplified hook for offline customers
export const useOfflineCustomers = () => {
  const [customers] = useState<any[]>([]);
  const [isLoading] = useState(false);
  const { currentStore } = useStore();

  const createCustomer = async (customerData: any): Promise<string> => {
    if (!currentStore?.id) {
      throw new Error('No store selected');
    }

    try {
      const isOffline = !navigator.onLine;
      
      // Sanitize customer data
      const sanitizedCustomerData = sanitizeForFirebase({
        ...customerData,
        name: customerData.name || 'Guest',
        phone: customerData.phone || '',
        ...(customerData.email && { email: customerData.email }),
      });
      
      if (isOffline) {
        const customerId = await offlineSync.saveCustomerOffline(sanitizedCustomerData, currentStore.id);
        return customerId;
      } else {
        try {
          const { collection, addDoc } = await import('firebase/firestore');
          const { db } = await import('../services/firebase');

          const firestoreCustomer = {
            ...sanitizedCustomerData,
            storeId: currentStore.id,
            timestamp: Date.now(),
          };

          const docRef = await addDoc(collection(db, 'customers'), firestoreCustomer);
          return docRef.id;
        } catch (error) {
          console.warn('Failed to save customer online, saving offline instead:', error);
          const customerId = await offlineSync.saveCustomerOffline(sanitizedCustomerData, currentStore.id);
          return customerId;
        }
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw error;
    }
  };

  return {
    customers,
    isLoading,
    createCustomer,
    findCustomerByPhone: () => undefined,
    refreshCustomers: () => {
      console.log('Refresh customers called');
    },
  };
}; 