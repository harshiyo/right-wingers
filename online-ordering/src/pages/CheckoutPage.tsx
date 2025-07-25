import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, Clock, Calendar, ChevronLeft, CreditCard, Store, User, Phone, Banknote, ShoppingCart } from 'lucide-react';
import { collection, addDoc, getDoc, doc, serverTimestamp, runTransaction, setDoc, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '../services/firebase';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { useStore } from '../context/StoreContext';
import { useTaxRate } from '../hooks/useTaxRate';
import { cn } from '../utils/cn';

type PaymentMethod = 'card' | 'cash';

interface InstructionTile {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

const generateOrderNumber = async (): Promise<string> => {
  try {
    const counterRef = doc(db, 'counters', 'onlineOrders');
    
    const newNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
      const newCount = currentCount + 1;
      
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      // Format: RWO (Roti Way Online) + 6 digits
      return `RWO${String(newCount).padStart(6, '0')}`;
    });
    
    return newNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to timestamp-based number if counter fails
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RWO${randomSuffix}${timestamp % 1000}`; // Use last 3 digits of timestamp
  }
};

const initializeCounterIfNeeded = async () => {
  try {
    const counterRef = doc(db, 'counters', 'onlineOrders');
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      await setDoc(counterRef, { count: 0 });
    }
  } catch (error) {
    console.error('Error initializing counter:', error);
  }
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { customerInfo } = useCustomer();
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const taxRate = useTaxRate();
  const [orderDetails, setOrderDetails] = useState<{
    type: 'pickup' | 'delivery';
    pickupTime?: 'asap' | 'scheduled';
    scheduledDateTime?: string;
    deliveryAddress?: {
      street: string;
      city: string;
      postalCode: string;
    };
  } | null>(null);

  // Load instruction tiles for mapping IDs to labels
  const [pizzaInstructionTiles] = useCollection(
    query(collection(db, 'pizzaInstructions'), orderBy('sortOrder'))
  );
  const [wingInstructionTiles] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );

  const pizzaInstructions = pizzaInstructionTiles?.docs
    .map((doc: any) => ({ id: doc.id, ...doc.data() } as InstructionTile))
    .filter((tile: InstructionTile) => tile.isActive) || [];
  
  const wingInstructions = wingInstructionTiles?.docs
    .map((doc: any) => ({ id: doc.id, ...doc.data() } as InstructionTile))
    .filter((tile: InstructionTile) => tile.isActive) || [];

  // Helper function to robustly map instructions to labels
  const getInstructionLabels = (instructions: any, itemType: 'pizza' | 'wings') => {
    if (!instructions || !Array.isArray(instructions) || instructions.length === 0) return [];
    const instructionTiles = itemType === 'pizza' ? pizzaInstructions : wingInstructions;
    return instructions
      .map((i: any) => {
        if (typeof i === 'string') {
          // Try to map as ID
          return instructionTiles.find(tile => tile.id === i)?.label || (i.length > 1 ? i : null);
        }
        if (typeof i === 'object' && i !== null) {
          // If object has label, use it; else try id
          if (i.label) return i.label;
          if (i.id) return instructionTiles.find(tile => tile.id === i.id)?.label;
        }
        return null;
      })
      .filter((label: any) => typeof label === 'string' && label.trim().length > 0);
  };

  // Helper function to render item customizations
  const renderItemCustomizations = (item: any) => {
    const customizations: string[] = [];

    // Handle size
    if (item.size) {
      customizations.push(`${item.size.charAt(0).toUpperCase() + item.size.slice(1)} Size`);
    }

    // Handle combo items
    if (item.isCombo && item.comboItems) {
      item.comboItems.forEach((combo: any) => {
        customizations.push(combo.name);

        if (combo.size) {
          customizations.push(`${combo.size.charAt(0).toUpperCase() + combo.size.slice(1)} Size`);
        }

        if (combo.toppings) {
          if (combo.toppings.wholePizza?.length) {
            const toppings = combo.toppings.wholePizza.map((t: any) => t.name).join(', ');
            customizations.push(`Whole Pizza: ${toppings}`);
          }
          if (combo.toppings.leftSide?.length) {
            const toppings = combo.toppings.leftSide.map((t: any) => t.name).join(', ');
            customizations.push(`Left Half: ${toppings}`);
          }
          if (combo.toppings.rightSide?.length) {
            const toppings = combo.toppings.rightSide.map((t: any) => t.name).join(', ');
            customizations.push(`Right Half: ${toppings}`);
          }
        }

        if (combo.sauces?.length) {
          const sauces = combo.sauces.map((s: any) => s.name).join(', ');
          customizations.push(`Sauces: ${sauces}`);
        }

        // Handle combo item instructions
        if (combo.instructions?.length) {
          const instructionLabels = getInstructionLabels(combo.instructions, 'pizza');
          if (instructionLabels.length > 0) {
            customizations.push(`Instructions: ${instructionLabels.join(', ')}`);
          }
        }
      });
    } else {
      // Handle individual item customizations
      if (item.toppings?.wholePizza?.length) {
        const toppings = item.toppings.wholePizza.map((t: any) => t.name).join(', ');
        customizations.push(`Toppings: ${toppings}`);
      }

      if (item.toppings?.leftSide?.length) {
        const toppings = item.toppings.leftSide.map((t: any) => t.name).join(', ');
        customizations.push(`Left Half: ${toppings}`);
      }

      if (item.toppings?.rightSide?.length) {
        const toppings = item.toppings.rightSide.map((t: any) => t.name).join(', ');
        customizations.push(`Right Half: ${toppings}`);
      }

      if (item.sauces?.length) {
        const sauces = item.sauces.map((s: any) => s.name).join(', ');
        customizations.push(`Sauces: ${sauces}`);
      }

      // Handle individual item instructions
      if (item.instructions?.length) {
        const itemType = item.name.toLowerCase().includes('wing') ? 'wings' : 'pizza';
        const instructionLabels = getInstructionLabels(item.instructions, itemType);
        if (instructionLabels.length > 0) {
          customizations.push(`Instructions: ${instructionLabels.join(', ')}`);
        }
      }
    }

    return customizations;
  };

  useEffect(() => {
    initializeCounterIfNeeded();
  }, []);

  // Load store's tax rate
  useEffect(() => {
    const loadTaxRate = async () => {
      if (!selectedStore?.id) return;
      
      try {
        const storeDoc = await getDoc(doc(db, 'stores', selectedStore.id));
        const storeTaxRate = storeDoc.data()?.taxRate;
        if (storeTaxRate) {
          // setTaxRate(storeTaxRate / 100); // Convert from percentage to decimal
        }
      } catch (error) {
        console.error('Error loading tax rate:', error);
      }
    };

    loadTaxRate();
  }, [selectedStore?.id]);

  useEffect(() => {
    // Get order details from sessionStorage
    const orderType = sessionStorage.getItem('orderType');
    if (!orderType || cartItems.length === 0) {
      navigate('/menu');
      return;
    }

    const details: any = { type: orderType };
    if (orderType === 'pickup') {
      details.pickupTime = sessionStorage.getItem('pickupTime') || 'asap';
      details.scheduledDateTime = sessionStorage.getItem('scheduledDateTime');
    } else {
      const deliveryAddress = sessionStorage.getItem('deliveryAddress');
      if (deliveryAddress) {
        details.deliveryAddress = JSON.parse(deliveryAddress);
      }
    }
    setOrderDetails(details);
  }, [navigate, cartItems.length]);

  const handleBack = () => {
    navigate('/cart');
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price + (item.extraCharges || 0)) * item.quantity, 0);
  const tax = subtotal * taxRate;
  const deliveryFee = orderDetails?.type === 'delivery' ? (subtotal >= 30 ? 0 : 3.99) : 0;
  const total = subtotal + tax + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedStore || !customerInfo || !orderDetails) {
        throw new Error('Missing required information');
      }

      // Generate order number
      const orderNumber = await generateOrderNumber();

      // Create order data structure matching POS system
      const orderData = {
        storeId: selectedStore.id,
        orderNumber,
        customerInfo: {
          name: customerInfo.fullName,
          phone: customerInfo.phone,
        },
        store: {
          id: selectedStore.id,
          name: selectedStore.name,
          address: selectedStore.address,
        },
        items: cartItems.map(item => ({
          ...item,
          baseId: item.id, // Keep original item ID for reference
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        orderType: orderDetails.type,
        paymentMethod: paymentMethod,
        paymentStatus: 'pending', // Will be updated when payment is processed
        status: 'pending',
        timestamp: Date.now(),
        source: 'online', // Tag as online order
        discounts: [], // Initialize empty discounts array
        discountTotal: 0,
        ...(orderDetails.type === 'delivery' && {
          deliveryDetails: {
            address: orderDetails.deliveryAddress?.street,
            city: orderDetails.deliveryAddress?.city,
            postalCode: orderDetails.deliveryAddress?.postalCode,
            fee: deliveryFee
          }
        }),
        ...(orderDetails.type === 'pickup' && {
          pickupDetails: {
            time: orderDetails.pickupTime,
            ...(orderDetails.scheduledDateTime && {
              scheduledTime: orderDetails.scheduledDateTime
            })
          }
        })
      };

      // Create order in Firebase
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('✅ Order created:', docRef.id);

      // Store order ID in session for confirmation page
      sessionStorage.setItem('lastOrderId', docRef.id);

      // Clear cart and navigate to confirmation with order details
      clearCart();
      navigate('/confirmation', {
        state: {
          orderDetails: {
            orderId: docRef.id,
            orderNumber,
            orderType: orderDetails.type,
            items: cartItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
              customizations: item.customizations,
            })),
            subtotal,
            tax,
            total,
            paymentMethod,
            pickupTime: orderDetails.type === 'pickup' ? {
              type: orderDetails.pickupTime || 'asap',
              scheduledTime: orderDetails.scheduledDateTime
            } : undefined,
            deliveryAddress: orderDetails.type === 'delivery' ? orderDetails.deliveryAddress : undefined
          }
        }
      });
    } catch (error) {
      console.error('Error processing order:', error);
      // TODO: Show error message to user
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Combined Pickup Order + Store Info Card */}
          <div className="card-ux p-5 mb-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
                  {orderDetails?.type === 'pickup' ? (
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                  ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Truck className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {orderDetails?.type === 'pickup' ? 'Pickup Order' : 'Delivery Order'}
                </h2>
                <p className="text-sm text-gray-600">Review your order details</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-2">
                  {orderDetails?.type === 'pickup' ? (
                    orderDetails.pickupTime === 'asap' ? (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4" />
                        <span>Ready in 15-25 minutes</span>
                      </div>
                    ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4" />
                        <span>Scheduled for {new Date(orderDetails.scheduledDateTime!).toLocaleString()}</span>
                      </div>
                    )
                  ) : (
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{orderDetails?.deliveryAddress?.street}</div>
                  <div>{orderDetails?.deliveryAddress?.city}</div>
                </div>
              )}
            </div>
            {/* Store Info */}
            {selectedStore && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{selectedStore.name}</h4>
                  <p className="text-sm text-gray-600 mb-0.5">{selectedStore.address}</p>
                  <p className="text-sm text-gray-600">{selectedStore.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Customer Info Card */}
          <div className="card-ux p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Customer Information</h3>
            </div>
            {customerInfo && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-gray-900 font-medium">{customerInfo.fullName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Phone className="w-4 h-4 text-gray-600" />
              </div>
                  <span className="text-gray-900 font-medium">{customerInfo.phone}</span>
                </div>
              </div>
              )}
          </div>

          {/* Order Items Card */}
          <div className="card-ux p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-red-600" />
              Order Items
            </h3>
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Your cart is empty.</div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item, index) => {
                  const customizations = renderItemCustomizations(item);
                  const itemPrice = item.price + (item.extraCharges || 0);
                  
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className="bg-white rounded-2xl border border-gray-100 p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">🍕</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                          {customizations.length > 0 && (
                            <div className="space-y-1 mb-3">
                              {customizations.map((customization, optIndex) => (
                                <span
                                  key={optIndex}
                                  className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-lg mr-1 mb-1"
                                >
                                  {customization}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-gray-900">
                                ${(itemPrice * item.quantity).toFixed(2)}
                              </p>
                              {item.quantity > 1 && (
                                <p className="text-sm text-gray-600">
                                  ${itemPrice.toFixed(2)} each
                                </p>
                              )}
                              {item.extraCharges && item.extraCharges > 0 && (
                                <p className="text-sm text-orange-600">
                                  +${item.extraCharges.toFixed(2)} extra
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

          {/* Payment Method Card */}
          <div className="card-ux p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Payment Method</h3>
        </div>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setPaymentMethod('card')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 w-full",
                  paymentMethod === 'card'
                    ? "border-red-600 bg-red-50 shadow-lg"
                    : "border-gray-200 hover:border-red-300 bg-white hover:shadow-md"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  paymentMethod === 'card' ? "bg-red-100" : "bg-gray-100"
                )}>
                <CreditCard className={cn(
                    "w-5 h-5",
                  paymentMethod === 'card' ? "text-red-600" : "text-gray-600"
                )} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Credit Card</div>
                  <div className="text-sm text-gray-600">Pay with card</div>
                </div>
                {paymentMethod === 'card' && (
                  <div className="ml-auto w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>

              <button
                onClick={() => setPaymentMethod('cash')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 w-full",
                  paymentMethod === 'cash'
                    ? "border-red-600 bg-red-50 shadow-lg"
                    : "border-gray-200 hover:border-red-300 bg-white hover:shadow-md"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  paymentMethod === 'cash' ? "bg-red-100" : "bg-gray-100"
                )}>
                <Banknote className={cn(
                    "w-5 h-5",
                  paymentMethod === 'cash' ? "text-red-600" : "text-gray-600"
                )} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Cash</div>
                  <div className="text-sm text-gray-600">Pay at pickup/delivery</div>
                </div>
                {paymentMethod === 'cash' && (
                  <div className="ml-auto w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="card-ux p-5 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              Order Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                <span className="font-medium text-gray-900">{formatPrice(tax)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium text-gray-900">{formatPrice(deliveryFee)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-red-600">{formatPrice(total)}</span>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
                <button
            onClick={handleSubmit}
                disabled={loading}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] text-lg"
              >
          {loading ? 'Processing Order...' : 'Place Order'}
              </button>
      </div>
    </div>
  );
} 