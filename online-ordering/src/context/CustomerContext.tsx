import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CustomerInfo {
  fullName: string;
  phone: string;
  email?: string;
  customerId?: string;
  orderType: 'pickup' | 'delivery' | null;
  pickupTime?: 'asap' | 'scheduled';
  scheduledDateTime?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
    instructions?: string;
  };
}

interface CustomerContextType {
  customerInfo: CustomerInfo | null;
  updateCustomerInfo: (info: Partial<CustomerInfo>) => void;
  clearCustomerInfo: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Load customer info from sessionStorage on mount
  useEffect(() => {
    const savedInfo = sessionStorage.getItem('customerInfo');
    const savedOrderType = sessionStorage.getItem('orderType');
    const savedPickupTime = sessionStorage.getItem('pickupTime');
    const savedScheduledDateTime = sessionStorage.getItem('scheduledDateTime');
    const savedDeliveryAddress = sessionStorage.getItem('deliveryAddress');
    const savedCustomerId = sessionStorage.getItem('customerId');

    const initialInfo: Partial<CustomerInfo> = {};

    if (savedInfo) {
      Object.assign(initialInfo, JSON.parse(savedInfo));
    }
    if (savedOrderType) {
      initialInfo.orderType = savedOrderType as 'pickup' | 'delivery';
    }
    if (savedPickupTime) {
      initialInfo.pickupTime = savedPickupTime as 'asap' | 'scheduled';
    }
    if (savedScheduledDateTime) {
      initialInfo.scheduledDateTime = savedScheduledDateTime;
    }
    if (savedDeliveryAddress) {
      initialInfo.deliveryAddress = JSON.parse(savedDeliveryAddress);
    }
    if (savedCustomerId) {
      initialInfo.customerId = savedCustomerId;
    }

    if (Object.keys(initialInfo).length > 0) {
      setCustomerInfo(initialInfo as CustomerInfo);
    }
  }, []);

  const updateCustomerInfo = (info: Partial<CustomerInfo>) => {
    setCustomerInfo(prev => {
      const updated = { ...prev, ...info } as CustomerInfo;
      
      // Save individual pieces to sessionStorage
      if (info.orderType) {
        sessionStorage.setItem('orderType', info.orderType);
      }
      if (info.pickupTime) {
        sessionStorage.setItem('pickupTime', info.pickupTime);
      }
      if (info.scheduledDateTime) {
        sessionStorage.setItem('scheduledDateTime', info.scheduledDateTime);
      }
      if (info.deliveryAddress) {
        sessionStorage.setItem('deliveryAddress', JSON.stringify(info.deliveryAddress));
      }
      if (info.customerId) {
        sessionStorage.setItem('customerId', info.customerId);
      }
      
      // Save the complete customer info
      sessionStorage.setItem('customerInfo', JSON.stringify(updated));
      
      return updated;
    });
  };

  const clearCustomerInfo = () => {
    setCustomerInfo(null);
    sessionStorage.removeItem('customerInfo');
    sessionStorage.removeItem('orderType');
    sessionStorage.removeItem('pickupTime');
    sessionStorage.removeItem('scheduledDateTime');
    sessionStorage.removeItem('deliveryAddress');
    sessionStorage.removeItem('customerId');
  };

  return (
    <CustomerContext.Provider
      value={{
        customerInfo,
        updateCustomerInfo,
        clearCustomerInfo
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
} 