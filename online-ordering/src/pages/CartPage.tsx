import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowRight, Plus, Minus, Trash2, ArrowLeft, Clock, MapPin, Package, Truck, Users, AlertCircle, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { useTaxRate } from '../hooks/useTaxRate';
import { cn } from '../utils/cn';

interface CartSummary {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    options?: string[];
  }>;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
}

interface OrderDetails {
  type: 'delivery' | 'pickup';
  address?: string;
  instructions?: string;
  scheduledTime?: string;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const { selectedStore } = useStore();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isAnimating, setIsAnimating] = useState<string | null>(null);
  const taxRate = useTaxRate();



  // Helper function to render customization details (copied from POS client OrderNotificationDialog)
  const renderCustomizationDetails = (item: any) => {
    const details: string[] = [];

    // Handle combo items: customizations as array or object with numeric keys (exact same logic as POS client)
    let comboArr = null;
    if (Array.isArray(item.customizations)) {
      comboArr = item.customizations;
    } else if (item.customizations && typeof item.customizations === 'object' && Object.keys(item.customizations).every(k => !isNaN(Number(k)))) {
      comboArr = Object.values(item.customizations);
    }

    if (comboArr && comboArr.length > 0) {
      // This is a combo item - process each step
      comboArr.forEach((step: any) => {
        // For steps with itemName (like sides/drinks), use the actual item name
        if (step.itemName && step.itemName.trim() !== '') {
          const stepSize = step.size ? ` (${step.size})` : '';
          details.push(`${step.itemName}${stepSize}`);
        } else {
          // For other steps (pizza, wings), use the step type
          const stepType = step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : 'Item';
          const stepSize = step.size ? ` (${step.size})` : '';
          details.push(`${stepType}${stepSize}`);
        }
        
        if (step.toppings) {
          const t = step.toppings;
          if (t.wholePizza && t.wholePizza.length > 0) {
            details.push(`  Whole: ${t.wholePizza.map((topping: any) => topping.name).join(', ')}`);
          }
          if (t.leftSide && t.leftSide.length > 0) {
            details.push(`  Left: ${t.leftSide.map((topping: any) => topping.name).join(', ')}`);
          }
          if (t.rightSide && t.rightSide.length > 0) {
            details.push(`  Right: ${t.rightSide.map((topping: any) => topping.name).join(', ')}`);
          }
        }
        
        if (step.sauces && step.sauces.length > 0) {
          details.push(`  Sauces: ${step.sauces.map((sauce: any) => sauce.name).join(', ')}`);
        }
        
        if (step.instructions && step.instructions.length > 0) {
          details.push(`  Instructions: ${step.instructions.join(', ')}`);
        }
      });
    } 
    // Handle non-combo items (only if it's NOT a combo)
    else if (!item.isCombo) {
      // Check customizations object first
      if (item.customizations && typeof item.customizations === 'object') {
        if (item.customizations.size) {
          details.push(`Size: ${item.customizations.size}`);
        }
        if (item.customizations.toppings) {
          const t = item.customizations.toppings;
          if (t.wholePizza && t.wholePizza.length > 0) {
            details.push(`Whole: ${t.wholePizza.map((topping: any) => topping.name).join(', ')}`);
          }
          if (t.leftSide && t.leftSide.length > 0) {
            details.push(`Left: ${t.leftSide.map((topping: any) => topping.name).join(', ')}`);
          }
          if (t.rightSide && t.rightSide.length > 0) {
            details.push(`Right: ${t.rightSide.map((topping: any) => topping.name).join(', ')}`);
          }
        }
        if (item.customizations.sauces && item.customizations.sauces.length > 0) {
          details.push(`Sauces: ${item.customizations.sauces.map((sauce: any) => sauce.name).join(', ')}`);
        }
        if (item.customizations.instructions && item.customizations.instructions.length > 0) {
          details.push(`Instructions: ${item.customizations.instructions.join(', ')}`);
        }
      }
      // Check direct properties (fallback)
      else {
        if (item.toppings) {
          const t = item.toppings;
          if (t.wholePizza && t.wholePizza.length > 0) {
            details.push(`Whole: ${t.wholePizza.map((topping: any) => topping.name).join(', ')}`);
          }
          if (t.leftSide && t.leftSide.length > 0) {
            details.push(`Left: ${t.leftSide.map((topping: any) => topping.name).join(', ')}`);
          }
          if (t.rightSide && t.rightSide.length > 0) {
            details.push(`Right: ${t.rightSide.map((topping: any) => topping.name).join(', ')}`);
          }
        }
        if (item.sauces && Array.isArray(item.sauces) && item.sauces.length > 0) {
          details.push(`Sauces: ${item.sauces.map((sauce: any) => sauce.name).join(', ')}`);
        }
        if (item.size) {
          details.push(`Size: ${item.size.charAt(0).toUpperCase() + item.size.slice(1)}`);
        }
        if (item.instructions && Array.isArray(item.instructions) && item.instructions.length > 0) {
          details.push(`Instructions: ${item.instructions.join(', ')}`);
        }
      }
    }

    return details.length > 0 ? details : null;
  };

  // Load store's tax rate
  useEffect(() => {
    const loadTaxRate = async () => {
      if (!selectedStore?.id) return;
      
      try {
        const storeDoc = await getDoc(doc(db, 'stores', selectedStore.id));
        const storeTaxRate = storeDoc.data()?.taxRate;
        if (storeTaxRate) {
          // The useTaxRate hook handles the conversion from percentage to decimal
        }
      } catch (error) {
        console.error('Error loading tax rate:', error);
      }
    };

    loadTaxRate();
  }, [selectedStore?.id]);

  useEffect(() => {
    // Get order details from sessionStorage
    const orderType = sessionStorage.getItem('orderType') as 'delivery' | 'pickup';
    const deliveryAddress = sessionStorage.getItem('deliveryAddress');
    const deliveryInstructions = sessionStorage.getItem('deliveryInstructions');
    const scheduledTime = sessionStorage.getItem('scheduledTime');

    if (orderType) {
      setOrderDetails({
        type: orderType,
        address: deliveryAddress || '',
        instructions: deliveryInstructions || '',
        scheduledTime: scheduledTime || '',
      });
    }
  }, []);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price + (item.extraCharges || 0)) * item.quantity, 0);
  const tax = subtotal * taxRate;
  const deliveryFee = orderDetails?.type === 'delivery' ? (subtotal >= 30 ? 0 : 3.99) : 0;
  const total = subtotal + tax + deliveryFee;

  const cartSummary: CartSummary = {
    items: cartItems.map(item => {
      const itemPrice = item.price + (item.extraCharges || 0);
      const options: string[] = [];

      // Combo item logic
      if (item.isCombo && item.comboItems) {
        item.comboItems.forEach(combo => {
          options.push(combo.name);

          if (combo.size) {
            options.push(`${combo.size.charAt(0).toUpperCase() + combo.size.slice(1)} Size`);
          }

          if (combo.toppings) {
            if (combo.toppings.wholePizza?.length) {
              const toppings = combo.toppings.wholePizza.map(t => t.name).join(', ');
              options.push(`Whole Pizza: ${toppings}`);
            }
            if (combo.toppings.leftSide?.length) {
              const toppings = combo.toppings.leftSide.map(t => t.name).join(', ');
              options.push(`Left Half: ${toppings}`);
            }
            if (combo.toppings.rightSide?.length) {
              const toppings = combo.toppings.rightSide.map(t => t.name).join(', ');
              options.push(`Right Half: ${toppings}`);
            }
          }

          if (combo.sauces?.length) {
            const sauces = combo.sauces.map(s => s.name).join(', ');
            options.push(`Sauces: ${sauces}`);
          }
        });
      } else {
        if (item.size) {
          options.push(`${item.size.charAt(0).toUpperCase() + item.size.slice(1)} Size`);
        }

        if (item.toppings?.wholePizza?.length) {
          const toppings = item.toppings.wholePizza.map(t => t.name).join(', ');
          options.push(`Toppings: ${toppings}`);
        }

        if (item.toppings?.leftSide?.length) {
          const toppings = item.toppings.leftSide.map(t => t.name).join(', ');
          options.push(`Left Half: ${toppings}`);
        }

        if (item.toppings?.rightSide?.length) {
          const toppings = item.toppings.rightSide.map(t => t.name).join(', ');
          options.push(`Right Half: ${toppings}`);
        }

        if (item.sauces?.length) {
          const sauces = item.sauces.map(s => s.name).join(', ');
          options.push(`Sauces: ${sauces}`);
        }
      }

      return {
        id: item.id,
        name: item.name,
        price: itemPrice,
        quantity: item.quantity,
        options
      };
    }),
    subtotal,
    tax,
    deliveryFee,
    total
  };

  const handleQuantityChange = async (index: number, change: number) => {
    const cartItem = cartItems[index];
    if (!cartItem.id) return;

    setIsAnimating(cartItem.id);
    
    if (change > 0) {
      updateQuantity(cartItem.id, cartItem.quantity + 1);
    } else if (cartItem.quantity > 1) {
      updateQuantity(cartItem.id, cartItem.quantity - 1);
    }

    setTimeout(() => setIsAnimating(null), 200);
  };

  const handleRemoveItem = async (index: number) => {
    const cartItem = cartItems[index];
    if (!cartItem.id) return;

    setIsAnimating(cartItem.id);
    
    setTimeout(() => {
      removeFromCart(cartItem.id);
      setIsAnimating(null);
    }, 300);
  };

  const handleContinue = () => {
    navigate('/checkout');
  };

  const getOrderTypeDetails = () => {
    if (!orderDetails) return null;

    if (orderDetails.type === 'delivery') {
      return {
        icon: <Truck className="w-5 h-5 text-orange-600" />,
        title: 'Delivery Order',
        subtitle: orderDetails.address || 'Address not set',
        badge: deliveryFee === 0 ? 'Free Delivery' : `$${deliveryFee.toFixed(2)} Delivery Fee`
      };
    } else {
      return {
        icon: <Package className="w-5 h-5 text-green-600" />,
        title: 'Pickup Order',
        subtitle: selectedStore?.name || 'Store not selected',
        badge: 'Ready in 15-25 min'
      };
    }
  };

  const orderTypeDetails = getOrderTypeDetails();

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md mx-auto px-4 py-8">
          {/* Empty State */}
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Cart is Empty</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Looks like you haven't added anything to your cart yet. 
              Browse our delicious menu and add your favorites!
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Browse Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Pickup Order Card */}
        {orderTypeDetails && (
          <div className="card-ux p-5 mb-6">
            <div className="flex items-center gap-3">
              {orderTypeDetails.icon}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{orderTypeDetails.title}</h3>
                <p className="text-sm text-gray-600 truncate">{orderTypeDetails.subtitle}</p>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                orderDetails?.type === 'delivery' 
                  ? "bg-orange-100 text-orange-800" 
                  : "bg-green-100 text-green-800"
              )}>
                {orderTypeDetails.badge}
              </span>
            </div>
          </div>
        )}

        {/* 2-column grid for items and summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Order Items Card */}
          <div className="card-ux p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-red-600" />
              Order Items
            </h3>
            {cartSummary.items.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Your cart is empty.</div>
            ) : (
              <div className="space-y-4">
                {cartSummary.items.map((item, index) => {
                  const cartItem = cartItems[index];
                                      const isAnimatingItem = isAnimating === cartItem.id;
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className={cn(
                        "bg-white rounded-2xl border border-gray-100 p-4 transition-all duration-300",
                        isAnimatingItem && "scale-95 opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">🍕</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                          {(() => {
                            const details = renderCustomizationDetails(cartItem);
                            return details && details.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm text-gray-600 whitespace-pre-line font-mono">
                                  {details.join('\n')}
                                </div>
                              </div>
                            );
                          })()}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center bg-gray-100 rounded-xl">
                                <button
                                  onClick={() => handleQuantityChange(index, -1)}
                                  disabled={item.quantity <= 1}
                                  className={cn(
                                    "p-2 rounded-l-xl transition-colors",
                                    item.quantity <= 1 
                                      ? "text-gray-400 cursor-not-allowed" 
                                      : "text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                                  )}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-4 py-2 font-medium text-gray-900 min-w-[3rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(index, 1)}
                                  className="p-2 rounded-r-xl text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-gray-900">
                                ${(item.price * item.quantity).toFixed(2)}
                              </p>
                              {item.quantity > 1 && (
                                <p className="text-sm text-gray-600">
                                  ${item.price.toFixed(2)} each
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Summary + Discount Card */}
          <div className="card-ux p-5 mb-6 flex flex-col gap-6">
            {/* Discount Code */}
            <div>
              <label htmlFor="discountCode" className="block text-sm font-semibold text-gray-900 mb-2">Discount Code</label>
              <div className="flex gap-2">
                <input
                  id="discountCode"
                  type="text"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent text-sm"
                  placeholder="Enter code"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold shadow hover:from-red-700 hover:to-red-800 transition-all">Apply</button>
              </div>
            </div>
            {/* Order Summary */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                Order Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{cartSummary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                  <span className="font-medium text-gray-900">{cartSummary.tax.toFixed(2)}</span>
                </div>
                {cartSummary.deliveryFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-medium text-gray-900">{cartSummary.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-red-600">{cartSummary.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-3"
        >
          <span className="text-lg">Continue to Checkout</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Trust Indicators */}
        <div className="mt-6 flex items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Fast Delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
}
