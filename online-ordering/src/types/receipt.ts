export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  customizations?: string[];
}

export interface ReceiptData {
  id?: string;
  orderId: string;
  storeId: string;
  orderSource: 'online' | 'pos';
  orderType: 'pickup' | 'delivery' | 'dine-in';
  customerInfo: {
    name: string;
    phone: string;
  };
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: number;
  status?: 'pending' | 'printed' | 'failed';
  printAttempts?: number;
  lastPrintAttempt?: number;
  deliveryDetails?: {
    address: string;
    city: string;
    postalCode: string;
  };
  pickupDetails?: {
    time: 'asap' | 'scheduled';
    scheduledTime?: string;
  };
}

export interface OrderDetails {
  orderId: string;
  orderType: 'pickup' | 'delivery';
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  pickupTime?: {
    type: 'asap' | 'scheduled';
    scheduledTime?: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
  };
}