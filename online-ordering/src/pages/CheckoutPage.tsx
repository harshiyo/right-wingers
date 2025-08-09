import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, Clock, Calendar, ChevronLeft, CreditCard, Store, User, Phone, Banknote, ShoppingCart, MapPin } from 'lucide-react';
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

const generateOrderNumber = async (storeId?: string): Promise<string> => {
  try {
    console.log(`🔄 generateOrderNumber called with storeId: ${storeId}`);
    
    if (!storeId) {
      console.log('⚠️ No storeId provided, using fallback system');
      // Fallback to old system if no store ID
      const counterRef = doc(db, 'counters', 'onlineOrders');
      
      const newNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
        const newCount = currentCount + 1;
        
        transaction.set(counterRef, { count: newCount }, { merge: true });
        
        // Format: RWO (Roti Way Online) + 6 digits
        return `RWO${String(newCount).padStart(6, '0')}`;
      });
      
      console.log(`✅ Generated fallback order number: ${newNumber}`);
      return newNumber;
    }

    console.log(`📦 Using store-specific order number generation for store: ${storeId}`);
    // Use store-specific order number generation
    const { generateStoreOrderNumber } = await import('../services/firebase');
    const result = await generateStoreOrderNumber(storeId, true);
    console.log(`✅ Store-specific order number generated: ${result}`);
    return result;
  } catch (error) {
    console.error('❌ Error generating order number:', error);
    console.error('📊 Error details:', {
      storeId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
    // Fallback to timestamp-based number if counter fails
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const fallbackNumber = `FALL${randomSuffix}${timestamp % 1000}`;
    console.log(`🔄 Using fallback order number: ${fallbackNumber}`);
    return fallbackNumber;
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

  // Helper function to render customization details (copied from CartPage)
  const renderCustomizationDetails = (item: any) => {
    const details: string[] = [];

    // Handle combo items: customizations as array or object with numeric keys (exact same logic as CartPage)
    let comboArr = null;
    if (Array.isArray(item.customizations)) {
      comboArr = item.customizations;
    } else if (item.customizations && typeof item.customizations === 'object' && Object.keys(item.customizations).every(k => !isNaN(Number(k)))) {
      comboArr = Object.values(item.customizations);
    }

    if (comboArr && comboArr.length > 0) {
      // This is a combo item - process each step
      comboArr.forEach((step: any) => {
        // Handle dipping sauces specially - always show "Dipping" as header
        if (step.type === 'dipping') {
          details.push('Dipping');
        }
        // For steps with itemName (like sides/drinks), use the actual item name
        else if (step.itemName && step.itemName.trim() !== '') {
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

        // Handle dipping sauces specially
        if (step.type === 'dipping' && step.selectedDippingSauces && step.sauceData) {
          // Show individual dipping sauce items
          Object.entries(step.selectedDippingSauces).forEach(([sauceId, quantity]: [string, any]) => {
            const sauceName = step.sauceData[sauceId]?.name || 'Dipping Sauce';
            details.push(`  ${quantity}x ${sauceName}`);
          });
        }
        
        if (step.instructions && step.instructions.length > 0) {
          details.push(`  Instructions: ${step.instructions.join(', ')}`);
        }

        // Add extra charge info for this specific step
        if (step.extraCharge > 0) {
          details.push(`  [EXTRA] +$${step.extraCharge.toFixed(2)}`);
        }
      });
    } 
    // Handle non-combo items (individual pizzas, wings, etc.)
    else if (!item.isCombo) {
      // For individual items, don't add a header since the item name is already shown
      // Check customizations object first
      if (item.customizations && typeof item.customizations === 'object') {
        if (item.customizations.size) {
          details.push(`  Size: ${item.customizations.size}`);
        }
        if (item.customizations.toppings) {
          const t = item.customizations.toppings;
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
        if (item.customizations.sauces && item.customizations.sauces.length > 0) {
          details.push(`  Sauces: ${item.customizations.sauces.map((sauce: any) => sauce.name).join(', ')}`);
        }
        if (item.customizations.instructions && item.customizations.instructions.length > 0) {
          details.push(`  Instructions: ${item.customizations.instructions.join(', ')}`);
        }
      }
      // Check direct properties (fallback for older format)
      else {
        if (item.toppings) {
          const t = item.toppings;
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
        if (item.sauces && Array.isArray(item.sauces) && item.sauces.length > 0) {
          details.push(`  Sauces: ${item.sauces.map((sauce: any) => sauce.name).join(', ')}`);
        }
        if (item.size) {
          details.push(`  Size: ${item.size.charAt(0).toUpperCase() + item.size.slice(1)}`);
        }
        if (item.instructions && Array.isArray(item.instructions) && item.instructions.length > 0) {
          details.push(`  Instructions: ${item.instructions.join(', ')}`);
        }
      }
      
      // Add extra charge info for individual items
      if (item.extraCharges > 0) {
        details.push(`  [EXTRA] +$${item.extraCharges.toFixed(2)}`);
      }
    }

    return details.length > 0 ? details : null;
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
      console.log(`🔄 Generating order number for store: ${selectedStore.id} (${selectedStore.name})`);
      const orderNumber = await generateOrderNumber(selectedStore.id);
      console.log(`✅ Generated order number: ${orderNumber}`);

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
        items: cartItems.map(item => {
          // Transform online order structure to match POS structure
          const transformedItem = {
            ...item,
            baseId: item.baseId || item.id, // Use baseId if available, otherwise fall back to id
          };

          // No legacy field handling needed - items already have proper customizations structure
          
          // Handle customizations exactly like POS client
          if (item.customizations) {
            // Convert array to object with numeric keys and filter undefined values
            if (Array.isArray(item.customizations)) {
              const customizationsObj: any = {};
              item.customizations.forEach((customization: any, index: number) => {
                const cleanCustomization: any = {};
                
                // Only add fields that are not undefined
                Object.keys(customization).forEach(key => {
                  if (customization[key] !== undefined) {
                    cleanCustomization[key] = customization[key];
                  }
                });
                
                customizationsObj[index] = cleanCustomization;
              });
              
              (transformedItem as any).customizations = customizationsObj;
            } else {
              // Already an object, just filter undefined values
              (transformedItem as any).customizations = Object.fromEntries(
                Object.entries(item.customizations).filter(([_, v]) => v !== undefined)
              );
            }
          }
          
          return transformedItem;
        }),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-200/30 to-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-200/10 to-yellow-200/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Combined Order Summary Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {orderDetails?.type === 'pickup' ? (
              <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Truck className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {orderDetails?.type === 'pickup' ? 'Pickup Order' : 'Delivery Order'}
              </h2>
              <p className="text-gray-600">Review your order details</p>
            </div>
          </div>

          {/* Store and Customer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Store Information */}
            {selectedStore && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {orderDetails?.type === 'pickup' ? 'Picking up from' : 'Delivering from'}
                    </p>
                    <p className="text-sm text-gray-600">{selectedStore.name}</p>
                  </div>
                </div>
                <div className="ml-13">
                  <p className="text-sm text-gray-600">{selectedStore.address}</p>
                  <p className="text-sm text-gray-600">{selectedStore.phone}</p>
                  {orderDetails?.type === 'delivery' && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <Clock className="w-3 h-3 mr-1" />
                        30-45 minutes
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Customer Information */}
            {customerInfo && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900">Customer Information</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-gray-900 font-medium">{customerInfo.fullName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-gray-900 font-medium">{customerInfo.phone}</span>
                  </div>
                  {orderDetails?.type === 'delivery' && orderDetails?.deliveryAddress && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <span className="text-gray-900 font-medium">{orderDetails.deliveryAddress.street}</span>
                        <p className="text-sm text-gray-600">{orderDetails.deliveryAddress.city}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Items Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Order Items</h3>
          </div>
          
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white/50 rounded-2xl">
              Your cart is empty.
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item, index) => {
                const details = renderCustomizationDetails(item);
                const itemPrice = item.price + (item.extraCharges || 0);
                
                return (
                  <div
                    key={`${item.id}-${index}`}
                    className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">🍕</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                        {details && details.length > 0 && (
                          <div className="mb-3 space-y-1">
                            {details.map((detail, idx) => {
                              const isCategory = !detail.startsWith('  ');
                              const isExtra = detail.includes('[EXTRA]');
                              const cleanDetail = detail.replace('[EXTRA]', '').trim();
                              
                              if (isCategory) {
                                return (
                                  <div key={idx} className="font-semibold text-gray-900 text-sm">
                                    {cleanDetail}
                                  </div>
                                );
                              } else if (isExtra) {
                                return (
                                  <div key={idx} className="text-sm text-red-600 font-medium ml-3">
                                    {cleanDetail}
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={idx} className="text-sm text-gray-600 ml-3">
                                    {cleanDetail}
                                  </div>
                                );
                              }
                            })}
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
                            {typeof item.extraCharges === 'number' && item.extraCharges > 0 && (
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

        {/* Payment Method and Order Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Payment Method Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Payment Method</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 w-full",
                  paymentMethod === 'card'
                    ? "border-red-600 bg-gradient-to-r from-red-50 to-red-100 shadow-lg"
                    : "border-gray-200 hover:border-red-300 bg-white hover:shadow-md"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  paymentMethod === 'card' ? "bg-red-100" : "bg-gray-100"
                )}>
                  <CreditCard className={cn(
                    "w-6 h-6",
                    paymentMethod === 'card' ? "text-red-600" : "text-gray-600"
                  )} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900 text-lg">Credit Card</div>
                  <div className="text-sm text-gray-600">Pay with card</div>
                </div>
                {paymentMethod === 'card' && (
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </button>

              <button
                onClick={() => setPaymentMethod('cash')}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 w-full",
                  paymentMethod === 'cash'
                    ? "border-red-600 bg-gradient-to-r from-red-50 to-red-100 shadow-lg"
                    : "border-gray-200 hover:border-red-300 bg-white hover:shadow-md"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  paymentMethod === 'cash' ? "bg-red-100" : "bg-gray-100"
                )}>
                  <Banknote className={cn(
                    "w-6 h-6",
                    paymentMethod === 'cash' ? "text-red-600" : "text-gray-600"
                  )} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900 text-lg">Cash</div>
                  <div className="text-sm text-gray-600">Pay at pickup/delivery</div>
                </div>
                {paymentMethod === 'cash' && (
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Order Summary</h3>
            </div>
            <div className="space-y-4">
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
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-red-600">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-5 px-6 rounded-3xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] text-lg"
        >
          {loading ? 'Processing Order...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
} 