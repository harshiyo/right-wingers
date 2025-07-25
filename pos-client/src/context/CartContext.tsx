import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  id: string;
  baseId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  customizations?: any;
  extraCharges?: number;
  isCombo?: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItem: (itemId: string, updatedItem: CartItem) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  debugCart: () => void;
  setCartItems: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  // Initialize cart items from localStorage immediately
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('pos-cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          return parsedCart;
        }
      }
    } catch (error) {
      console.error('Error loading cart from storage during initialization:', error);
    }
    return [];
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pos-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: CartItem) => {
    setCartItems(prevItems => [...prevItems, item]);
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateCartItem = (itemId: string, updatedItem: CartItem) => {
    setCartItems(prevItems => 
      prevItems.map(item => item.id === itemId ? updatedItem : item)
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('pos-cart');
  };

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price + (item.extraCharges || 0)) * item.quantity, 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const debugCart = () => {
    console.log('=== CART DEBUG ===');
    console.log('Current cartItems:', cartItems);
    console.log('localStorage pos-cart:', localStorage.getItem('pos-cart'));
    console.log('=================');
  };

  const setCartItemsDirect = (items: CartItem[]) => {
    setCartItems(items);
  };

  const contextValue: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    getCartTotal,
    getCartItemCount,
    debugCart,
    setCartItems: setCartItemsDirect
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}; 