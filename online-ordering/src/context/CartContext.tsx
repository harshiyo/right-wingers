import React, { createContext, useContext, useState, useEffect } from 'react';

// Types
interface Topping {
  id: string;
  name: string;
  price: number;
}

interface ToppingSide {
  wholePizza: Topping[];
  leftSide: Topping[];
  rightSide: Topping[];
}

interface ComboItem {
  id: string;
  name: string;
  quantity: number;
  size?: string;
  sauces?: { name: string; price?: number }[];
  toppings?: ToppingSide;
  isHalfAndHalf?: boolean;
  extraCharges?: number;
  instructions?: string[];
}

export interface CartItem {
  id: string;
  uniqueId?: string; // Added for unique identification
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  toppings?: ToppingSide;
  sauces?: { name: string; price?: number }[];
  extraCharges?: number;
  isHalfAndHalf?: boolean;
  isCombo?: boolean;
  comboItems?: ComboItem[];
  size?: 'small' | 'medium' | 'large';
  customizations?: string[];
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (uniqueId: string) => void;
  updateQuantity: (uniqueId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
}

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper function to generate a unique ID based on item properties
const generateUniqueId = (item: CartItem) => {
  const customizations = {
    toppings: item.toppings ? JSON.stringify(item.toppings) : '',
    sauces: item.sauces ? JSON.stringify(item.sauces) : '',
    size: item.size || '',
    isHalfAndHalf: item.isHalfAndHalf || false,
    comboItems: item.isCombo ? JSON.stringify(item.comboItems) : ''
  };
  return `${item.id}-${JSON.stringify(customizations)}`;
};

// Provider component
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    const items = savedCart ? JSON.parse(savedCart) : [];
    // Ensure all items have a uniqueId
    return items.map((item: CartItem) => ({
      ...item,
      uniqueId: item.uniqueId || generateUniqueId(item)
    }));
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: CartItem) => {
    setCartItems(prevItems => {
      // Generate a unique ID for the item based on its properties
      const uniqueId = generateUniqueId(item);
      
      // Find existing item with the same unique ID
      const existingItem = prevItems.find(i => i.uniqueId === uniqueId);
      
      if (existingItem) {
        // Update quantity of existing item
        return prevItems.map(i =>
          i.uniqueId === uniqueId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      // Add new item with unique ID
      return [...prevItems, { ...item, uniqueId, quantity: 1 }];
    });
  };

  const removeFromCart = (uniqueId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.uniqueId !== uniqueId));
  };

  const updateQuantity = (uniqueId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(uniqueId);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.uniqueId === uniqueId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const itemTotal = (item.price + (item.extraCharges || 0)) * item.quantity;
      return total + itemTotal;
    }, 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 