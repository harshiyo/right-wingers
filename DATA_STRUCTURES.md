# POS System Data Structures

This document tracks the data structures used across different parts of the POS system to ensure consistency in data handling and display.

## Orders

### Order Structure
```typescript
interface Order {
  id: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    phone: string;
  };
  store: {
    id: string;
    name: string;
    address: string;
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  orderType: 'dine-in' | 'pickup' | 'delivery';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  timestamp: number;
  source: 'online' | 'pos';
  discounts: any[];
  discountTotal: number;
  pickupDetails?: {
    time: 'asap' | 'scheduled';
    scheduledTime?: string;
  };
  deliveryDetails?: {
    address: string;
    city: string;
    postalCode: string;
    instructions?: string;
  };
  createdAt: string;
}

interface OrderItem {
  id: string;
  baseId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  extraCharges?: number;
  // New format - sauces at root level
  sauces?: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    isSpicy: boolean;
    isVegan: boolean;
  }>;
  instructions?: Array<{
    label: string;
    // Add other instruction fields as discovered
  }>;
  // Legacy format - may still exist in older orders
  customizations?: OrderItemCustomization;
}
```

### Customization Structures

Different item types have different customization structures. Here are the known formats:

#### Wing Customizations
```typescript
// New Format (July 2023+)
interface WingItem {
  // ... standard OrderItem fields ...
  sauces: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    isSpicy: boolean;
    isVegan: boolean;
  }>;
  instructions: Array<{
    label: string;
  }>;
}

// Example:
{
  "id": "Bt26w8lq3oNUCekhaSxy",
  "name": "1Lb Wings",
  "price": 11.99,
  "quantity": 1,
  "imageUrl": "...",
  "extraCharges": 0.5,
  "sauces": [
    {
      "id": "degNrLJPhveBYacNF2Da",
      "name": "BBQ",
      "description": "Sweet and tangy barbecue sauce",
      "price": 0,
      "isSpicy": false,
      "isVegan": true
    }
  ],
  "instructions": []
}
```

#### Pizza Customizations
```typescript
interface PizzaCustomizations {
  size?: string;
  toppings?: {
    wholePizza?: Array<{name: string; price?: number}>;
    leftSide?: Array<{name: string; price?: number}>;
    rightSide?: Array<{name: string; price?: number}>;
  };
  isHalfAndHalf?: boolean;
}
```

## Known Variations and Edge Cases

### Wing Orders
- Sauces can appear in two places:
  1. Root level `sauces` array (new format)
  2. Inside `customizations` object (legacy format)
- Extra charges are calculated based on premium sauces
- Instructions are optional and may be empty array

### Pizza Orders
- TODO: Document topping structure variations
- TODO: Document size format variations

## Updating This Document

When encountering new data structures or variations:

1. Add debug logs to capture the structure
2. Update this document with the new information
3. Update display logic in relevant components to handle the new structure
4. Add comments referencing this document in code where complex data handling occurs

## Recent Updates

- Added actual wing order structure from production data
- Documented new sauce format at root level of order items
- Added example of complete wing order structure 