import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Simple function to clean phone number to digits only
const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
  };
  orderCount: number;
  lastOrderDate: string;
  storeId: string;
  notes?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedDate?: string;
  blockedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Find customer by phone number
export const findCustomerByPhone = async (phone: string): Promise<Customer | undefined> => {
  try {
    const cleanPhone = cleanPhoneNumber(phone);
    const customersQuery = query(
      collection(db, 'customers'),
      where('phone', '==', cleanPhone)
    );
    const snapshot = await getDocs(customersQuery);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Customer;
    }
    
    return undefined;
  } catch (error) {
    console.error('❌ Error finding customer by phone:', error);
    return undefined;
  }
};

// Create or update customer
export const createOrUpdateCustomer = async (customerData: {
  phone: string;
  name: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
  };
  storeId: string;
}): Promise<Customer> => {
  try {
    const cleanPhone = cleanPhoneNumber(customerData.phone);
    
    // Check if customer already exists
    const existingCustomer = await findCustomerByPhone(cleanPhone);
    
    if (existingCustomer) {
      // Update existing customer
      const customerRef = doc(db, 'customers', existingCustomer.id);
      const updateData: any = {
        name: customerData.name,
        phone: cleanPhone,
        storeId: customerData.storeId,
        updatedAt: new Date().toISOString()
      };
      
      if (customerData.email) {
        updateData.email = customerData.email;
      }
      
      // Only include address if all fields are provided
      if (customerData.address && customerData.address.street && customerData.address.city && customerData.address.postalCode) {
        updateData.address = customerData.address;
      }
      
      await updateDoc(customerRef, updateData);
      
      return {
        ...existingCustomer,
        ...updateData
      };
    } else {
      // Create new customer
      const newCustomerData: any = {
        phone: cleanPhone,
        name: customerData.name,
        storeId: customerData.storeId,
        orderCount: 0,
        lastOrderDate: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (customerData.email) {
        newCustomerData.email = customerData.email;
      }
      
      // Only include address if all fields are provided
      if (customerData.address && customerData.address.street && customerData.address.city && customerData.address.postalCode) {
        newCustomerData.address = customerData.address;
      }
      
      const docRef = await addDoc(collection(db, 'customers'), newCustomerData);
      
      return {
        id: docRef.id,
        ...newCustomerData
      };
    }
  } catch (error) {
    console.error('❌ Error creating/updating customer:', error);
    throw error;
  }
}; 