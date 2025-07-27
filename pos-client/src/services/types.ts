export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    phone: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    modifiers?: string[];
    extraCharges?: number;
    customizations?: any; // <-- Add this line for combo/pizza customizations
  }>;
  total: number;
  createdAt: number;
  // Optional fields for receipt rendering
  storeAddress?: string;
  storePhone?: string;
  orderType?: string;
  deliveryAddress?: string;
  subtotal?: number;
  tax?: number;
  paymentMethod?: string;
  // Scheduled order information - using correct Firebase structure
  pickupDetails?: {
    estimatedTime?: string;
    scheduledDateTime?: string;
  };
  deliveryDetails?: {
    scheduledDeliveryDateTime?: string;
    street?: string;
    city?: string;
    postalCode?: string;
  };
  // Legacy fields for backward compatibility
  pickupTime?: 'asap' | 'scheduled';
  scheduledDateTime?: string;
  deliveryTimeType?: 'asap' | 'scheduled';
  scheduledDeliveryDateTime?: string;
  estimatedPickupTime?: string;
} 