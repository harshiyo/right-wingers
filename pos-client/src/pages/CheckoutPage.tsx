import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TopBar } from '../components/layout/TopBar';
import { useCart } from '../context/CartContext';
import logoImg from '../assets/logo.png';
import { 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Receipt, 
  User, 
  MapPin, 
  Clock, 
  Phone, 
  ShoppingCart,
  ArrowLeft,
  Check,
  Printer,
  Mail,
  MessageSquare,
  AlertCircle,
  Percent,
  CheckCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useOfflineOrders } from '../hooks/useOfflineOrders';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { getPizzaInstructionLabels, getWingInstructionLabels } from '../utils/cartHelpers';
import { printReceiptIfLocal } from '../services/printReceiptIfLocal';
import { Order } from '../services/types';
import { DiscountCodeService, type DiscountCode } from '../services/discountCodes';

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
  // Add for diff/receipt rendering only:
  isNew?: boolean;
  isUpdated?: boolean;
}

interface Customer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
  };
}

type PaymentMethod = 'cash' | 'card' | 'mobile' | 'split';

interface PaymentDetails {
  method: PaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
  mobileAmount?: number;
  discount?: number;
}

// Payment method cards component
const PaymentMethodCard = memo(({ 
  method, 
  icon: Icon, 
  title, 
  description, 
  isSelected, 
  onClick 
}: {
  method: PaymentMethod;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "p-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md text-left w-full",
      isSelected 
        ? "border-red-600 bg-red-50 shadow-lg" 
        : "border-gray-200 hover:border-gray-300 bg-white"
    )}
  >
    <div className="flex items-center gap-2">
      <div className={cn(
        "p-2 rounded-lg",
        isSelected ? "bg-red-100" : "bg-gray-100"
      )}>
        <Icon className={cn(
          "h-4 w-4",
          isSelected ? "text-red-600" : "text-gray-600"
        )} />
      </div>
              <div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      {isSelected && (
        <div className="ml-auto">
          <Check className="h-5 w-5 text-red-600" />
        </div>
      )}
    </div>
  </button>
));

PaymentMethodCard.displayName = 'PaymentMethodCard';

// Order summary component
const OrderSummary = memo(({ 
  cartItems, 
  subtotal, 
  tax, 
  discount, 
  total 
}: {
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}) => {
  // Fetch instruction tiles for converting IDs to labels
  const [pizzaInstructionTiles] = useCollection(
    query(collection(db, 'pizzaInstructions'), orderBy('sortOrder'))
  );
  const [wingInstructionTiles] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );

  const formatCustomizations = (item: CartItem) => {
    if (!item.customizations) return null;
    
    
    const details = [];
    
    // Size
    if (item.customizations.size) {
      console.log('🔍 DEBUG: Adding size:', item.customizations.size);
      details.push(`Size: ${item.customizations.size}`);
    }
    
    // Pizza toppings (updated to match MenuPage structure)
    if (item.customizations.toppings) {
      const toppings: string[] = [];
      
      const processToppings = (side: string, toppingArray: any[]) => {
        if (toppingArray && toppingArray.length > 0) {
          const toppingNames = toppingArray
            .map((t: any) => t.name || t)
            .filter((name: any) => name && name !== '' && String(name) !== '0');
          if (toppingNames.length > 0) {
            toppings.push(`${side}: ${toppingNames.join(', ')}`);
          }
        }
      };

      // Process each side's toppings
      if (item.customizations.toppings.wholePizza) {
        processToppings('Whole', item.customizations.toppings.wholePizza);
      }
      if (item.customizations.toppings.leftSide) {
        processToppings('Left', item.customizations.toppings.leftSide);
      }
      if (item.customizations.toppings.rightSide) {
        processToppings('Right', item.customizations.toppings.rightSide);
      }
      
      if (toppings.length > 0) {
        details.push('Toppings:');
        toppings.forEach(topping => details.push(`  ${topping}`));
      }
    }
    
    // Half and half indicator
    if (item.customizations.isHalfAndHalf) {
      details.push(`Half & Half Pizza`);
    }
    
    // Wing sauces (handle both array of objects and simple arrays)
    if (item.customizations.sauces && item.customizations.sauces.length > 0) {
      console.log('🔍 DEBUG: Processing sauces:', item.customizations.sauces);
      const sauceNames = item.customizations.sauces
        .map((s: any) => s.name || s)
        .filter((name: any) => name && name !== '' && name !== 0 && name !== '0');
      console.log('🔍 DEBUG: Filtered sauce names:', sauceNames);
      if (sauceNames.length > 0) {
        details.push(`Sauces: ${sauceNames.join(', ')}`);
      }
    }
    
    // Instructions (handle both array of strings and array of objects)
    if (item.customizations.instructions && item.customizations.instructions.length > 0) {
      let instructionLabels: string[] = [];
      if (item.customizations.type === 'wings') {
        instructionLabels = getWingInstructionLabels(wingInstructionTiles, item.customizations.instructions);
      } else {
        instructionLabels = getPizzaInstructionLabels(pizzaInstructionTiles, item.customizations.instructions);
      }
      if (instructionLabels.length > 0) {
        details.push(`Instructions: ${instructionLabels.join(', ')}`);
      }
    }
    
    // Handle combo arrays (for combo customizations)
    if (Array.isArray(item.customizations)) {
      const typeOrder = { pizza: 1, wings: 2, side: 3, drink: 4 };
      const sortedCustomizations = [...item.customizations].sort((a, b) => 
        (typeOrder[a.type as keyof typeof typeOrder] || 5) - (typeOrder[b.type as keyof typeof typeOrder] || 5)
      );
      let pizzaCount = 0;
      sortedCustomizations.forEach((step, idx) => {
        let stepLabel = '';
        if (step.type === 'pizza') {
          stepLabel = `Pizza ${++pizzaCount}${step.isHalfAndHalf ? ' (Half & Half)' : ''}${step.size ? ` (${step.size})` : ''}`;
        } else if (step.type === 'wings') {
          stepLabel = `Wings${step.size ? ` (${step.size})` : ''}`;
        } else if (step.type === 'side') {
          stepLabel = `Side${step.size ? ` (${step.size})` : ''}`;
        } else if (step.type === 'drink') {
          stepLabel = `Drink${step.size ? ` (${step.size})` : ''}`;
        } else {
          stepLabel = step.itemName || `Item ${idx + 1}`;
        }
        details.push(stepLabel);
        // Toppings
        if (step.toppings && step.toppings.wholePizza && step.toppings.wholePizza.length > 0) {
          details.push(`  Whole: ${step.toppings.wholePizza.map((t: any) => t.name).join(', ')}`);
        }
        if (step.toppings && step.toppings.leftSide && step.toppings.leftSide.length > 0) {
          details.push(`  Left: ${step.toppings.leftSide.map((t: any) => t.name).join(', ')}`);
        }
        if (step.toppings && step.toppings.rightSide && step.toppings.rightSide.length > 0) {
          details.push(`  Right: ${step.toppings.rightSide.map((t: any) => t.name).join(', ')}`);
        }
        // Sauces
        if (step.sauces && step.sauces.length > 0) {
          details.push(`  Sauces: ${step.sauces.map((s: any) => s.name).join(', ')}`);
        }
        // Instructions for each combo step
        if (step.instructions && step.instructions.length > 0) {
          const instructionLabels = step.type === 'wings'
            ? getWingInstructionLabels(wingInstructionTiles, step.instructions)
            : getPizzaInstructionLabels(pizzaInstructionTiles, step.instructions);
          if (instructionLabels.length > 0) {
            details.push(`  Instructions: ${instructionLabels.join(', ')}`);
          }
        }
        // Extra charge
        if (Number(step.extraCharge) > 0) {
          details.push(`  Extra Charge: +$${Number(step.extraCharge).toFixed(2)}`);
        }
      });
    }
    
    console.log('🔍 DEBUG: Final details array for', item.name, ':', details);
    const filteredDetails = details.filter(detail => detail != null && detail !== '' && String(detail).trim() !== '0');
    if (!Array.isArray(filteredDetails) || filteredDetails.length === 0) return [];
    return filteredDetails;
  };

  console.log('CART ITEMS:', JSON.stringify(cartItems, null, 2));
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Items List - Scrollable */}
      <div 
        className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0 cart-items-scroll" 
        style={{ 
          maxHeight: 'calc(100vh - 400px)'
        }}
      >
        {cartItems.map((item) => {
          const customizations = formatCustomizations(item);
          return (
            <div key={item.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-10 h-10 object-cover rounded-md flex-shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-900 text-xs">{item.name}</h4>
                    <p className="font-bold text-gray-900 ml-2 text-xs">
                      ${((item.price + (item.extraCharges || 0)) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">Quantity: {item.quantity}</p>
                  
                  {/* Detailed customizations */}
                  {Array.isArray(customizations) && customizations.length > 0 && (
                    <div className="space-y-1">
                      {customizations
                        .filter(detail => detail != null && detail !== '' && String(detail).trim() !== '0')
                        .map((detail, index) => {

                          // Handle bold formatting for Whole, Left, Right
                          const isIndented = detail.startsWith('  ');
                          const cleanDetail = detail.replace(/^  /, '');
                          
                          // Check for topping section labels
                          if (cleanDetail.match(/^(Whole|Left|Right):/)) {
                            const [label, ...rest] = cleanDetail.split(':');
                            return (
                              <div key={index} className="text-xs text-gray-600 leading-relaxed ml-4">
                                • <span className="font-bold">{label}:</span>{rest.join(':')}
                              </div>
                            );
                          }
                          
                          // Check if it's just "Toppings:" header or "Sauces:" header
                          if (cleanDetail === 'Toppings:' || cleanDetail.startsWith('Sauces:')) {
                            return (
                              <div key={index} className="text-xs text-gray-700 leading-relaxed font-semibold">
                                • {cleanDetail}
                              </div>
                            );
                          }
                          
                          return (
                            <div key={index} className={`text-xs text-gray-600 leading-relaxed ${isIndented ? 'ml-4' : ''}`}>
                              • {cleanDetail}
                            </div>
                          );
                        })}
                    </div>
                  )}
                  
                  {/* Extra charges */}
                  {typeof item.extraCharges === 'number' && item.extraCharges > 0 && (
  <p className="text-xs text-red-600 mt-1">
    Extra charges: +${item.extraCharges.toFixed(2)}
  </p>
)}

                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Totals - Fixed at bottom */}
      <div className="border-t pt-3 space-y-1 flex-shrink-0">
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-red-600 text-sm">
            <span>Discount:</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Tax (13%):</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
});

OrderSummary.displayName = 'OrderSummary';

// Customer info component
const CustomerInfoCard = memo(({ 
  customer, 
  orderType, 
  phone,
  pickupTime,
  scheduledDateTime,
  deliveryTimeType,
  scheduledDeliveryDateTime
}: {
  customer: Customer;
  orderType: string;
  phone: string;
  pickupTime?: 'asap' | 'scheduled';
  scheduledDateTime?: string;
  deliveryTimeType?: 'asap' | 'scheduled';
  scheduledDeliveryDateTime?: string;
}) => {
  if (!customer || !customer.name) {
    return null;
  }

  // Enhanced timing and order type information
  const getOrderTypeInfo = () => {
    if (orderType === 'pickup') {
      if (pickupTime === 'scheduled' && scheduledDateTime) {
        return {
          icon: <Clock className="h-4 w-4 text-orange-600" />,
          label: 'Scheduled Pickup',
          time: new Date(scheduledDateTime).toLocaleString(),
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-800'
        };
      } else {
        return {
          icon: <Clock className="h-4 w-4 text-green-600" />,
          label: 'Pickup ASAP',
          time: 'Ready in 15-25 minutes',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800'
        };
      }
    } else if (orderType === 'delivery') {
      if (deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime) {
        return {
          icon: <Clock className="h-4 w-4 text-purple-600" />,
          label: 'Scheduled Delivery',
          time: new Date(scheduledDeliveryDateTime).toLocaleString(),
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-800'
        };
      } else {
        return {
          icon: <Clock className="h-4 w-4 text-blue-600" />,
          label: 'Delivery ASAP',
          time: 'Delivered in 30-45 minutes',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-800'
        };
      }
    } else {
      return {
        icon: <Clock className="h-4 w-4 text-gray-600" />,
        label: 'Dine-in',
        time: 'Ready when prepared',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-800'
      };
    }
  };

  const orderTypeInfo = getOrderTypeInfo();

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2 flex-shrink-0">
        <User className="h-4 w-4" />
        Customer Information
      </h2>
      <div className="space-y-3 flex-1">
        {/* Customer Name */}
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <div className="p-1.5 rounded-lg bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="font-bold text-green-800 text-sm">{customer.name}</p>
            <p className="text-xs text-gray-600">Customer</p>
          </div>
        </div>
        
        {/* Phone Number */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <div className="p-1.5 rounded-lg bg-blue-100">
            <Phone className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{phone}</p>
            <p className="text-xs text-gray-600">Phone Number</p>
          </div>
        </div>
        
        {/* Order Type & Timing */}
        <div className={`flex items-center gap-2 p-3 ${orderTypeInfo.bgColor} rounded-lg`}>
          <div className={`p-1.5 rounded-lg ${orderTypeInfo.bgColor.replace('50', '100')}`}>
            {orderTypeInfo.icon}
          </div>
          <div>
            <p className={`font-semibold ${orderTypeInfo.textColor} text-sm capitalize`}>
              {orderTypeInfo.label}
            </p>
            <p className="text-xs text-gray-600">{orderTypeInfo.time}</p>
          </div>
        </div>

        {/* Delivery Address (if delivery order) */}
        {orderType === 'delivery' && customer.address && (
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="p-1.5 rounded-lg bg-gray-100 mt-0.5">
              <MapPin className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Delivery Address</p>
              <p className="text-xs text-gray-600">
                {customer.address.street}
                {customer.address.city && `, ${customer.address.city}`}
                {customer.address.postalCode && `, ${customer.address.postalCode}`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
CustomerInfoCard.displayName = 'CustomerInfoCard';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pickupTime, scheduledDateTime, deliveryTimeType, scheduledDeliveryDateTime, deliveryAddress } = location.state || {};
  const { cartItems, clearCart } = useCart();
  const { createOrder } = useOfflineOrders();
  const { currentStore } = useStore();
  
  const { customer, phone, orderType = 'Pickup', editingOrderId } = location.state || {};

  // Add this line:
  const modifiedItemsRef = useRef<any[]>([]);

  // Save original order to localStorage for modification diff/receipt
  useEffect(() => {
    if (editingOrderId && location.state?.originalOrder) {
      localStorage.setItem('originalOrder', JSON.stringify(location.state.originalOrder));
    }
  }, [editingOrderId, location.state]);

  // Modal state for modification prompt - DEPRECATED: Now using direct update
  const [showModificationPrompt, setShowModificationPrompt] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(false); // Prevent double submit
  const [showOrderSuccess, setShowOrderSuccess] = useState(false); // New state for success modal

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [mobileAmount, setMobileAmount] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<DiscountCode | null>(null);
  const [discountCodeError, setDiscountCodeError] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);
  const [taxRate, setTaxRate] = useState(0.13); // Default to 13%

  // Add state for order save tracking
  const [orderSaved, setOrderSaved] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [savedOrderNumber, setSavedOrderNumber] = useState<string | null>(null);

  // Load store's tax rate
  useEffect(() => {
    const loadTaxRate = async () => {
      if (!currentStore?.id) return;
      
      try {
        const storeDoc = await getDoc(doc(db, 'stores', currentStore.id));
        const storeTaxRate = storeDoc.data()?.taxRate;
        if (storeTaxRate) {
          setTaxRate(storeTaxRate / 100); // Convert from percentage to decimal
        }
      } catch (error) {
        console.error('Error loading tax rate:', error);
      }
    };

    loadTaxRate();
  }, [currentStore?.id]);
  
  // Calculate totals
  const subtotal = useMemo(() => 
    cartItems.reduce((sum: number, item: CartItem) => 
      sum + (item.price + (item.extraCharges || 0)) * item.quantity, 0
    ), [cartItems]
  );
  
  const discountAmount = useMemo(() => 
    discountPercent ? (subtotal * parseFloat(discountPercent)) / 100 : discount,
    [subtotal, discountPercent, discount]
  );
  
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;
  
  // Redirect if no cart data
  useEffect(() => {
    if (!cartItems.length || !customer || !phone) {
      navigate('/menu', { state: { customer, orderType } });
      return;
    }
  }, [cartItems, customer, phone, navigate, orderType]);

  // Early return if no data
  if (!cartItems.length || !customer || !phone) {
    return null;
  }
  
  // Payment method options
  const paymentMethods = useMemo(() => [
    {
      method: 'cash' as PaymentMethod,
      icon: DollarSign,
      title: 'Cash',
      description: 'Pay with cash'
    },
    {
      method: 'card' as PaymentMethod,
      icon: CreditCard,
      title: 'Card',
      description: 'Credit/Debit card'
    }
  ], []);
  
  // Handlers
  const handleGoBack = useCallback(() => {
    navigate('/menu', { state: { customer, phone, orderType } });
  }, [navigate, customer, phone, orderType]);
  
  const handleDiscountChange = useCallback((value: string) => {
    setDiscountPercent(value);
    if (value) {
      const percent = parseFloat(value);
      if (!isNaN(percent) && percent >= 0 && percent <= 100) {
        setDiscount((subtotal * percent) / 100);
      }
    } else {
      setDiscount(0);
    }
  }, [subtotal]);

  const handleDiscountCodeChange = useCallback((value: string) => {
    setDiscountCode(value);
    setDiscountCodeError('');
    if (appliedDiscountCode) {
      setAppliedDiscountCode(null);
      setDiscount(0);
    }
  }, [appliedDiscountCode]);

  const validateDiscountCode = useCallback(async () => {
    if (!discountCode.trim()) {
      setDiscountCodeError('Please enter a discount code');
      return;
    }

    setIsValidatingCode(true);
    setDiscountCodeError('');

    try {
      const result = await DiscountCodeService.validateDiscountCode(
        discountCode,
        subtotal,
        orderType
      );

      if (result.isValid && result.discountCode && result.discountAmount) {
        setAppliedDiscountCode(result.discountCode);
        setDiscount(result.discountAmount);
        setDiscountCodeError('');
      } else {
        setDiscountCodeError(result.error || 'Invalid discount code');
        setAppliedDiscountCode(null);
        setDiscount(0);
      }
    } catch (error) {
      console.error('Error validating discount code:', error);
      setDiscountCodeError('Error validating discount code');
      setAppliedDiscountCode(null);
      setDiscount(0);
    } finally {
      setIsValidatingCode(false);
    }
  }, [discountCode, subtotal, orderType]);

  const removeDiscountCode = useCallback(() => {
    setAppliedDiscountCode(null);
    setDiscountCode('');
    setDiscount(0);
    setDiscountCodeError('');
  }, []);
  
  // Update handleProcessPayment to handle both new orders and modifications with new Electron API
  const handleProcessPayment = useCallback(async () => {
    if (isProcessing || orderSaved) return; // Prevent duplicate saves
    setIsProcessing(true);

    try {
      // Simulate payment processing (if needed)
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!currentStore) {
        alert('No store selected. Cannot place order.');
        setIsProcessing(false);
        return;
      }

      // Check if we're editing an existing order
      if (editingOrderId) {
        // For modifications, update the existing order directly
        try {
          // Generate order data for update
          let orderData = {
            customerInfo: {
              name: customer.name,
              phone: phone,
              ...(customer.email && { email: customer.email }),
              address: customer.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.postalCode}` : undefined,
            },
            items: cartItems.map(item => {
              const base: any = {
                id: item.id,
                baseId: item.baseId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                extraCharges: item.extraCharges || 0,
                imageUrl: item.imageUrl,
              };
              if (item.customizations) {
                base.customizations = Object.fromEntries(
                  Object.entries(item.customizations).filter(([_, v]) => v !== undefined)
                );
              }
              return base;
            }),
            subtotal: subtotal,
            tax: tax,
            discount: discountAmount,
            total: total,
            orderType: (typeof orderType === 'string' && ['pickup','delivery','dine-in'].includes(orderType.toLowerCase()) ? orderType.toLowerCase() : 'pickup'),
            paymentMethod: paymentMethod,
            paymentStatus: 'paid',
            createdAt: new Date().toISOString(),
            store: {
              id: currentStore.id,
              name: currentStore.name,
              address: currentStore.address,
            },
            discounts: [],
            discountTotal: 0,
            ...(orderType === 'delivery' && customer.address ? { deliveryDetails: { ...customer.address, ...(deliveryAddress || {}), ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}) } } : {}),
            ...(orderType === 'pickup' ? { pickupDetails: { estimatedTime: '15-25 minutes', ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {}) } } : {}),
            source: 'pos',
          };

          // Update existing order in Firestore
          const updateData = deepRemoveUndefined(orderData);
          const orderRef = doc(db, 'orders', editingOrderId);
          await updateDoc(orderRef, updateData);

          // Get the order number from the original order
          const orderNumber = location.state?.orderNumber || editingOrderId;

          // Set the saved order info for receipt printing
          setSavedOrderId(editingOrderId);
          setSavedOrderNumber(orderNumber);
          setOrderSaved(true);

          // Show receipt options instead of automatically printing
          setShowReceiptOptions(true);
        } catch (error) {
          console.error('Failed to update order:', error);
          alert('Failed to update order. Please try again.');
        }
      } else {
        // For new orders, save to database
        if (!orderSaved) {
          // Generate order data
          let orderData = {
            customerInfo: {
              name: customer.name,
              phone: phone,
              ...(customer.email && { email: customer.email }),
              address: customer.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.postalCode}` : undefined,
            },
            items: cartItems.map(item => {
              const base: any = {
                id: item.id,
                baseId: item.baseId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                extraCharges: item.extraCharges || 0,
                imageUrl: item.imageUrl,
              };
              if (item.customizations) {
                base.customizations = Object.fromEntries(
                  Object.entries(item.customizations).filter(([_, v]) => v !== undefined)
                );
              }
              return base;
            }),
            subtotal: subtotal,
            tax: tax,
            discount: discountAmount,
            total: total,
            orderType: (typeof orderType === 'string' && ['pickup','delivery','dine-in'].includes(orderType.toLowerCase()) ? orderType.toLowerCase() : 'pickup'),
            paymentMethod: paymentMethod,
            paymentStatus: 'paid',
            createdAt: new Date().toISOString(),
            store: {
              id: currentStore.id,
              name: currentStore.name,
              address: currentStore.address,
            },
            discounts: [],
            discountTotal: 0,
            ...(orderType === 'delivery' && customer.address ? { deliveryDetails: { ...customer.address, ...(deliveryAddress || {}), ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}) } } : {}),
            ...(orderType === 'pickup' ? { pickupDetails: { estimatedTime: '15-25 minutes', ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {}) } } : {}),
            source: 'pos',
          };
          const cleanedOrderData = deepRemoveUndefined(orderData);
          const orderId = await createOrder(cleanedOrderData);
          setSavedOrderId(orderId);
          
          // Apply discount code if one was used
          if (appliedDiscountCode) {
            try {
              await DiscountCodeService.applyDiscountCode(appliedDiscountCode.id);
              console.log('✅ Discount code applied successfully');
            } catch (error) {
              console.error('Error applying discount code:', error);
            }
          }
          
          // Try to get the order number from Firestore (or use fallback)
          let orderNumber = '';
          try {
            const orderDoc = await getDoc(doc(db, 'orders', orderId));
            orderNumber = orderDoc.exists() ? (orderDoc.data().orderNumber || orderId) : orderId;
          } catch {
            orderNumber = orderId;
          }
          setSavedOrderNumber(orderNumber);
          setOrderSaved(true);
        }
        setShowReceiptOptions(true);
      }
      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);
      alert('Failed to process payment or save order. Please try again.');
    }
  }, [isProcessing, orderSaved, currentStore, customer, phone, cartItems, subtotal, tax, discountAmount, orderType, paymentMethod, createOrder, deepRemoveUndefined, deliveryAddress, deliveryTimeType, scheduledDeliveryDateTime, pickupTime, scheduledDateTime, editingOrderId, clearCart, navigate]);
  
  // Utility to remove undefined fields from an object (shallow)
  function removeUndefinedFields(obj: Record<string, any>) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
  }

  // Utility to log all undefined fields in an object (deep)
  function logUndefinedFields(obj: any, path: string[] = []) {
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => logUndefinedFields(item, [...path, `[${idx}]`]));
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        if (value === undefined) {
          console.warn('Undefined field:', [...path, key].join('.'));
        } else {
          logUndefinedFields(value, [...path, key]);
        }
      });
    }
  }

  // Utility to deeply remove all undefined fields from an object/array
  function deepRemoveUndefined(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(deepRemoveUndefined);
    } else if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, deepRemoveUndefined(v)])
      );
    }
    return obj;
  }

  // Helper to normalize customizations for comparison
  function normalizeCustomizationsForCompare(customizations: any): any {
    if (
      customizations &&
      typeof customizations === 'object' &&
      !Array.isArray(customizations) &&
      Object.keys(customizations).every(k => !isNaN(Number(k)))
    ) {
      // Convert object with numeric keys to array
      return Object.values(customizations);
    }
    return customizations;
  }

  // Inline type definition for OfflineOrder (copied from useOfflineOrders.ts)
  interface OfflineOrder {
    id: string;
    storeId: string;
    orderNumber: string;
    customerId?: string;
    customerInfo: {
      name: string;
      phone: string;
      email?: string;
      address?: string;
    };
    store: {
      id: string;
      name: string;
      address?: string;
    };
    items: any[];
    subtotal: number; // <-- ADD
    tax: number;      // <-- ADD
    discount: number; // <-- ADD
    total: number;
    orderType: 'pickup' | 'delivery' | 'dine-in';
    paymentMethod: string; // <-- ADD
    paymentStatus: string; // <-- ADD
    status: 'pending' | 'synced' | 'failed';
    createdAt: string; // <-- ADD (ISO string)
    timestamp: number; // <-- ADD
    offline: boolean;
    deliveryDetails?: any;
    pickupDetails?: any;
    discounts?: Array<{
      id: string;
      name: string;
      amount: number;
      type: 'percentage' | 'fixed';
    }>;
    discountTotal?: number;
    source?: string; // <-- ADD
  }

  // --- Robust diff function for modified orders ---
  function diffOrderItems(originalItems: any[], modifiedItems: any[]) {
    // Map by id for fast lookup
    const origMap = new Map(originalItems.map(item => [item.id, item]));
    const modMap = new Map(modifiedItems.map(item => [item.id, item]));
    const added = [];
    const removed = [];
    const updated = [];

    // Find added and updated
    for (const modItem of modifiedItems) {
      const origItem = origMap.get(modItem.id);
      if (!origItem) {
        added.push({ ...modItem, isNew: true });
      } else {
        // Compare quantity, price, and customizations
        const normOrig = normalizeCustomizationsForCompare(origItem.customizations);
        const normMod = normalizeCustomizationsForCompare(modItem.customizations);
        if (
          origItem.quantity !== modItem.quantity ||
          origItem.price !== modItem.price ||
          JSON.stringify(normOrig) !== JSON.stringify(normMod)
        ) {
          updated.push({ ...modItem, isUpdated: true });
        }
      }
    }
    // Find removed
    for (const origItem of originalItems) {
      if (!modMap.has(origItem.id)) {
        removed.push({ ...origItem, isRemoved: true });
      }
    }
    return { added, removed, updated };
  }

  // Refactored: handleCompleteOrder does not show modal, just places order
  const handleCompleteOrder = useCallback(async (modificationType?: 'full' | 'modified') => {
    if (editingOrderId && !modificationType) {
      setShowModificationPrompt(true);
      return;
    }
    if (!currentStore) {
      alert('No store selected. Cannot place order.');
      setPendingOrder(false);
      return;
    }
    try {
      // Generate order number
      const generateOrderNumber = () => {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = Date.now().toString().slice(-4);
        return `RW${dateStr}${timeStr}`;
      };

      // For now, both options send all cart items. In the future, filter for only modified items if needed.
      let itemsToSend: any[] = cartItems;
      if (editingOrderId) {
        // Compare to original items and tag new/changed ones
        const originalItemsRaw = localStorage.getItem('originalOrderItems');
        let originalItems: any[] = [];
        try {
          if (originalItemsRaw) originalItems = JSON.parse(originalItemsRaw);
        } catch {}
        itemsToSend = cartItems.map(item => {
          const original = originalItems.find(oi => oi.id === item.id);
          // Normalize customizations for both sides before comparing
          const normOrig = original ? normalizeCustomizationsForCompare(original.customizations) : undefined;
          const normCurr = normalizeCustomizationsForCompare(item.customizations);
          const isChanged = !original || JSON.stringify(normOrig) !== JSON.stringify(normCurr) || original.quantity !== item.quantity || original.price !== item.price;
          return isChanged ? { ...item, isUpdated: true } : { ...item, isUpdated: false };
        });
      }

      // Create order data
      // For createOrder, use the correct type
      let orderData: Omit<OfflineOrder, 'id' | 'storeId' | 'status' | 'timestamp' | 'offline'> = {
        orderNumber: editingOrderId && location.state?.orderNumber ? location.state.orderNumber : generateOrderNumber(),
        customerInfo: {
          name: customer.name,
          phone: phone,
          ...(customer.email && { email: customer.email }),
          address: customer.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.postalCode}` : undefined,
        },
        items: itemsToSend.map(item => {
          const base: any = {
            id: item.id,
            baseId: item.baseId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            extraCharges: item.extraCharges || 0,
            imageUrl: item.imageUrl,
          };
          // Only add customizations if they exist and are not empty
          if (item.customizations) {
            base.customizations = Object.fromEntries(
              Object.entries(item.customizations).filter(([_, v]) => v !== undefined)
            );
          }
          return base;
        }),
        subtotal: subtotal,
        tax: tax,
        discount: discountAmount,
        total: total,
        orderType: (typeof orderType === 'string' && ['pickup','delivery','dine-in'].includes(orderType.toLowerCase()) ? orderType.toLowerCase() : 'pickup') as 'pickup' | 'delivery' | 'dine-in',
        paymentMethod: paymentMethod,
        paymentStatus: 'paid',
        createdAt: new Date().toISOString(),
        store: {
          id: currentStore.id,
          name: currentStore.name,
          address: currentStore.address,
        },
        discounts: [],
        discountTotal: 0,
        ...(orderType === 'delivery' && customer.address ? { deliveryDetails: { ...customer.address, ...(deliveryAddress || {}), ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}) } } : {}),
        ...(orderType === 'pickup' ? { pickupDetails: { estimatedTime: '15-25 minutes', ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {}) } } : {}),
        source: 'pos',
      };

      // --- LOGGING FOR KITCHEN SEND ---
      if (editingOrderId && modificationType) {
        if (modificationType === 'full') {
          const fullOrderData = {
            ...orderData,
            items: itemsToSend
          };
          console.log('[KITCHEN] Sending FULL ORDER to kitchen:', JSON.stringify(fullOrderData, null, 2));
        } else if (modificationType === 'modified') {
          const modifiedItems = (itemsToSend as any[]).filter(item => item.isUpdated);
          // Find removed items
          let removedItems: any[] = [];
          try {
            const originalItemsRaw = localStorage.getItem('originalOrderItems');
            if (originalItemsRaw) {
              const originalItems = JSON.parse(originalItemsRaw);
              removedItems = originalItems.filter((orig: any) => !itemsToSend.some((curr: any) => curr.id === orig.id))
                .map((item: any) => ({ id: item.id, name: item.name, action: 'removed' }));
            }
          } catch {}
          const partialOrderData = {
            ...orderData,
            items: [...modifiedItems, ...removedItems]
          };
          console.log('[KITCHEN] Sending ONLY MODIFIED ITEMS to kitchen:', JSON.stringify(partialOrderData, null, 2));
        }
      }
      // --- END LOGGING ---

      if (editingOrderId) {
        // For updateDoc, use Record<string, any> and remove undefined fields
        const updateData = deepRemoveUndefined(orderData);
        // Debug: log all undefined fields before update
        logUndefinedFields(orderData);
        // Update existing order in Firestore
        const orderRef = doc(db, 'orders', editingOrderId);
        await updateDoc(orderRef, updateData);
        // Show a custom modal or UI feedback instead of alert
        setShowOrderSuccess(true); // You may need to add this state and a modal below
        // Show receipt for modified orders before clearing cart/navigating
        if (modificationType === 'modified') {
          generateModifiedReceipt('modified');
        }
      } else {
        // Save order (handles both online and offline)
        const cleanedOrderData = deepRemoveUndefined(orderData);
        const orderId = await createOrder(cleanedOrderData);
        console.log('Order created successfully:', orderId);
        setShowOrderSuccess(true); // Show success modal
      }

      // Clear the cart and navigate back
      clearCart();
      navigate('/customer-lookup');
    } catch (error) {
      console.error('Failed to create/update order:', error);
      alert('Failed to save order. Please try again.');
    } finally {
      setPendingOrder(false);
    }
  }, [navigate, clearCart, createOrder, customer, phone, cartItems, total, subtotal, discountAmount, orderType, paymentMethod, editingOrderId, currentStore, showOrderSuccess, location.state]);

  // Handler for modal choice (just sets state) - DEPRECATED: Now using direct update
  const handleModificationPromptChoice = (choice: 'full' | 'modified') => {
    setShowModificationPrompt(false);
    handleCompleteOrder(choice);
  };

  // Update generateModifiedReceipt to use the above variables directly (do not call useCollection inside it)
  const generateModifiedReceipt = useCallback((modificationType?: 'full' | 'modified') => {
    if (!customer || !customer.name) {
      console.error('Cannot generate receipt: customer data missing');
      return;
    }

    if (editingOrderId) {
      // Compare to original items and tag new/changed ones
      const originalItemsRaw = localStorage.getItem('originalOrderItems');
      let originalItems: any[] = [];
      try {
        if (originalItemsRaw) originalItems = JSON.parse(originalItemsRaw);
      } catch {}
      const itemsToSend = cartItems.map(item => {
        const original = originalItems.find(oi => oi.id === item.id);
        // Normalize customizations for both sides before comparing
        const normOrig = original ? normalizeCustomizationsForCompare(original.customizations) : undefined;
        const normCurr = normalizeCustomizationsForCompare(item.customizations);
        const isChanged = !original || JSON.stringify(normOrig) !== JSON.stringify(normCurr) || original.quantity !== item.quantity || original.price !== item.price;
        return isChanged ? { ...item, isUpdated: true } : { ...item, isUpdated: false };
      });

      if (modificationType) {
        if (modificationType === 'modified') {
          const modifiedItems = (itemsToSend as any[]).filter(item => item.isUpdated);
          let removedItems: any[] = [];
          try {
            const originalItemsRaw = localStorage.getItem('originalOrderItems');
            if (originalItemsRaw) {
              const originalItems = JSON.parse(originalItemsRaw);
              removedItems = originalItems.filter((orig: any) => !itemsToSend.some((curr: any) => curr.id === orig.id))
                .map((item: any) => ({ id: item.id, name: item.name, action: 'removed', price: item.price, quantity: item.quantity }));
            }
          } catch {}
          // Save the exact data sent to kitchen for receipt
          modifiedItemsRef.current = [...modifiedItems, ...removedItems];
        }
      }
    }

    // Generate receipt items for modified items
    const generateReceiptItemHtml = (item: CartItem) => {
      // Typecast to allow isNew/isUpdated for rendering
      const typedItem = item as CartItem & { isNew?: boolean; isUpdated?: boolean };
      let customizationText = '';
      let tags = [];
      if (typedItem.isNew) tags.push('<span style="background:#22d3ee;color:#0e7490;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;margin-left:6px;">NEW</span>');
      if (typedItem.isUpdated && !typedItem.isNew) tags.push('<span style="background:#fef08a;color:#b45309;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;margin-left:6px;">MODIFIED</span>');
      if (item.customizations) {
        const details = [];
        if (!Array.isArray(item.customizations)) {
          if (item.customizations.size) {
            details.push(`Size: ${item.customizations.size}`);
          }
          if (item.customizations.toppings) {
            const toppings = [];
            if (item.customizations.toppings.wholePizza && item.customizations.toppings.wholePizza.length > 0) {
              const toppingNames = item.customizations.toppings.wholePizza.map((t: any) => t.name || t).filter((name: any) => name && name !== '' && String(name) !== '0');
              if (toppingNames.length > 0) {
                toppings.push(`&nbsp;&nbsp;<strong>Whole:</strong> ${toppingNames.join(', ')}`);
              }
            }
            if (toppings.length > 0) {
              details.push(`<strong>Toppings:</strong><br>${toppings.join('<br>')}`);
            }
          }
          if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) {
            const sauceNames = item.customizations.sauces.map((s: any) => s.name || s).filter((name: any) => name && name !== '' && String(name) !== '0');
            if (sauceNames.length > 0) {
              details.push(`<strong>Sauces:</strong> ${sauceNames.join(', ')}`);
            }
          }
          // Instructions
          if (item.customizations.instructions && Array.isArray(item.customizations.instructions) && item.customizations.instructions.length > 0) {
            const instructions = item.customizations.instructions.map((inst: any) => inst.name || inst).join(', ');
            if (instructions) {
              details.push(`<strong>Instructions:</strong> ${instructions}`);
            }
          }
        } else {
          // Combo customizations (array of steps)
          let comboModified = false;
          item.customizations.forEach((step: any, index: number) => {
            const stepDetails = [];
            let stepName = step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : `Item ${index + 1}`;
            stepDetails.push(`&nbsp;&nbsp;<strong>${stepName}</strong>${step.size ? ` (${step.size})` : ''}`);
            if (step.toppings) {
              const toppings = [];
              if (step.toppings.wholePizza && step.toppings.wholePizza.length > 0) {
                const toppingNames = step.toppings.wholePizza.map((t: any) => t.name || t).filter((name: any) => name && name !== '' && String(name) !== '0');
                if (toppingNames.length > 0) {
                  toppings.push(`&nbsp;&nbsp;&nbsp;&nbsp;<strong>Whole:</strong> ${toppingNames.join(', ')}`);
                }
              }
              if (toppings.length > 0) {
                stepDetails.push(...toppings);
              }
            }
            if (step.sauces && step.sauces.length > 0) {
              const sauceNames = step.sauces.map((s: any) => s.name || s).filter((name: any) => name && name !== '' && String(name) !== '0');
              if (sauceNames.length > 0) {
                stepDetails.push(`&nbsp;&nbsp;&nbsp;&nbsp;<strong>Sauces:</strong> ${sauceNames.join(', ')}`);
              }
            }
            // Instructions
            if (step.instructions && Array.isArray(step.instructions) && step.instructions.length > 0) {
              const instructions = step.instructions.map((inst: any) => inst.name || inst).join(', ');
              if (instructions) {
                stepDetails.push(`&nbsp;&nbsp;&nbsp;&nbsp;<strong>Instructions:</strong> ${instructions}`);
              }
            }
            if (step.extraCharge && Number(step.extraCharge) > 0) {
              stepDetails.push(`&nbsp;&nbsp;&nbsp;&nbsp;<strong>Extra Charge:</strong> +$${Number(step.extraCharge).toFixed(2)}`);
            }
            // Combo step diff: if step.isUpdated or step.isNew, mark combo as modified
            if (step.isUpdated || step.isNew) comboModified = true;
            details.push(stepDetails.join('<br>'));
          });
          // If any combo step is modified, show tag
          if (comboModified) tags.push('<span style="background:#fef08a;color:#b45309;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;margin-left:6px;">MODIFIED</span>');
        }
        customizationText = details.join('<br>    ');
      }
      return `
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${item.quantity}x ${item.name} ${tags.join(' ')}</span>
            <span>$${((item.price + (item.extraCharges || 0)) * item.quantity).toFixed(2)}</span>
          </div>
          ${customizationText ? `<div style="font-size: 10px; color: #666; margin-left: 15px;">${customizationText}</div>` : ''}
          ${item.extraCharges && item.extraCharges > 0 ? `<div style="font-size: 10px; color: #666; margin-left: 15px;"><strong>Extra charges:</strong> +$${item.extraCharges.toFixed(2)}</div>` : ''}
        </div>
      `;
    };
    // Generate receipt items for removed items
    const generateRemovedItemHtml = (item: any) => {
      return `
        <div style="margin-bottom: 8px; text-decoration: line-through; color: #dc2626;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${item.quantity}x ${item.name}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background-color: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">REMOVED</span>
              <span>$${((item.price + (item.extraCharges || 0)) * item.quantity).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    };

    // Build the receipt items HTML
    let receiptItemsHtml = '';
    
    if (modifiedItemsRef.current.length > 0) {
      receiptItemsHtml += `<div style="color: #2563eb; font-weight: bold; margin-bottom: 5px;">MODIFIED ITEMS:</div>`;
      receiptItemsHtml += modifiedItemsRef.current.map(generateReceiptItemHtml).join('');
    }
    
    if (modifiedItemsRef.current.filter((item: any) => item.action === 'removed').length > 0) {
      receiptItemsHtml += `<div style="color: #dc2626; font-weight: bold; margin-top: 10px;">REMOVED ITEMS:</div>`;
      receiptItemsHtml += modifiedItemsRef.current.filter((item: any) => item.action === 'removed').map(generateRemovedItemHtml).join('');
    }

    // If no changes detected, show a message
    if (modifiedItemsRef.current.length === 0 && modifiedItemsRef.current.filter((item: any) => item.action === 'removed').length === 0) {
      receiptItemsHtml = `<div style="text-align: center; color: #666; font-style: italic; padding: 20px;">No changes detected in this order.</div>`;
    }

    const receiptContent = `
      <div style="width: 300px; margin: 0 auto; font-family: monospace; font-size: 12px; line-height: 1.4;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoImg}" alt="Right Wingers Logo" style="width: 80px; height: 80px; margin-bottom: 10px; object-fit: contain;" />
          <div style="font-weight: bold; font-size: 16px;">Right Wingers</div>
          <div style="font-size: 10px;">Oakville • (905) 555-0123</div>
          <div style="font-size: 10px;">www.rightwingers.ca</div>
        </div>
        
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0;">
          <div style="text-align: center; font-weight: bold;">ORDER MODIFICATION RECEIPT</div>
          <div style="text-align: center;">${new Date().toLocaleString()}</div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div><strong>Customer:</strong> ${customer.name}</div>
          <div><strong>Phone:</strong> ${phone}</div>
          <div><strong>Order Type:</strong> ${orderType}</div>
          <div><strong>Original Order #:</strong> ${location.state?.orderNumber || 'N/A'}</div>
          ${orderType === 'pickup' ? 
            (pickupTime === 'scheduled' && scheduledDateTime ? 
              `<div><strong>Scheduled Pickup:</strong> ${new Date(scheduledDateTime).toLocaleString()}</div>` : 
              `<div><strong>Pickup Time:</strong> ASAP (15-25 minutes)</div>`
            ) : 
            orderType === 'delivery' ? 
              (deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? 
                `<div><strong>Scheduled Delivery:</strong> ${new Date(scheduledDeliveryDateTime).toLocaleString()}</div>` : 
                `<div><strong>Delivery Time:</strong> ASAP</div>`
              ) : ''
          }
          ${orderType === 'delivery' && customer.address ? 
            `<div><strong>Address:</strong> ${customer.address.street}, ${customer.address.city}, ${customer.address.postalCode}</div>` : 
            ''
          }
        </div>
        
        <div style="border-top: 1px dashed #000; padding-top: 10px; margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 10px;">MODIFICATIONS</div>
          ${receiptItemsHtml}
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 10px;">
          <div>Payment Method: ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</div>
          <div style="margin-top: 10px;">Thank you for your order!</div>
          <div>Follow us @RightWingers</div>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Modified Order Receipt - Right Wingers</title>
            <style>
              body { margin: 0; padding: 20px; }
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            ${receiptContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [cartItems, customer, phone, orderType, paymentMethod, editingOrderId, location.state, getPizzaInstructionLabels, getWingInstructionLabels, pickupTime, scheduledDateTime, deliveryTimeType, scheduledDeliveryDateTime]);
  
  // On Complete Order button click
  const handleCompleteOrderClick = () => {
    if (editingOrderId) {
      setShowModificationPrompt(true);
    } else {
      handleCompleteOrder();
    }
  };

  // --- Print Full Receipt (all items, like new order) ---
  const printFullReceipt = useCallback(async () => {
    if (!savedOrderId || !savedOrderNumber) return;
    const orderForPrint: Order = {
      id: savedOrderId,
      storeId: currentStore?.id ?? '',
      storeName: currentStore?.name ?? '',
      orderNumber: savedOrderNumber,
      customerInfo: {
        name: customer.name,
        phone: phone,
      },
      items: cartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        modifiers: [],
        extraCharges: item.extraCharges || 0,
        customizations: item.customizations,
      })),
      total: total,
      createdAt: Date.now(),
      storeAddress: currentStore?.address ?? '',
      storePhone: currentStore?.phone ?? '',
      orderType: orderType,
      subtotal: subtotal,
      tax: tax,
      paymentMethod: paymentMethod,
      // Include scheduled order information - using correct Firebase structure
      pickupDetails: orderType === 'pickup' ? {
        estimatedTime: '15-25 minutes',
        ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {})
      } : undefined,
      deliveryDetails: orderType === 'delivery' ? {
        ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}),
        ...(customer.address ? {
          street: customer.address.street,
          city: customer.address.city,
          postalCode: customer.address.postalCode
        } : {})
      } : undefined,
    };
    // Use 'modified-full' for modified orders, 'new' for new orders
    const receiptType = editingOrderId ? 'modified-full' : 'new';
    await printReceiptIfLocal(orderForPrint, currentStore?.id ?? '', receiptType);
  }, [savedOrderId, savedOrderNumber, currentStore, customer, phone, cartItems, total, subtotal, tax, paymentMethod, orderType, editingOrderId, pickupTime, scheduledDateTime, deliveryTimeType, scheduledDeliveryDateTime]);

  // --- Print Modified Receipt (only changed items) ---
  const printModifiedReceipt = useCallback(async () => {
    if (!savedOrderId || !savedOrderNumber) return;
    const originalItemsRaw = localStorage.getItem('originalOrderItems');
    let originalItems = [];
    try {
      if (originalItemsRaw) originalItems = JSON.parse(originalItemsRaw);
    } catch {}
    const { added, removed, updated } = diffOrderItems(originalItems, cartItems);
    // Compose the order object with only changed items, including isNew, isRemoved, isUpdated flags
    const items = [
      ...added.map(i => ({ ...i, isNew: true })),
      ...removed.map(i => ({ ...i, isRemoved: true })),
      ...updated.map(i => ({ ...i, isUpdated: true })),
    ];
    const orderForPrint: Order = {
      id: savedOrderId,
      storeId: currentStore?.id ?? '',
      storeName: currentStore?.name ?? '',
      orderNumber: savedOrderNumber,
      customerInfo: {
        name: customer.name,
        phone: phone,
      },
      items,
      total: total, // You may want to omit or adjust totals for partial receipts
      createdAt: Date.now(),
      storeAddress: currentStore?.address ?? '',
      storePhone: currentStore?.phone ?? '',
      orderType: orderType,
      subtotal: subtotal,
      tax: tax,
      paymentMethod: paymentMethod,
      // Include scheduled order information - using correct Firebase structure
      pickupDetails: orderType === 'pickup' ? {
        estimatedTime: '15-25 minutes',
        ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {})
      } : undefined,
      deliveryDetails: orderType === 'delivery' ? {
        ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}),
        ...(customer.address ? {
          street: customer.address.street,
          city: customer.address.city,
          postalCode: customer.address.postalCode
        } : {})
      } : undefined,
    };
    await printReceiptIfLocal(orderForPrint, currentStore?.id ?? '', 'modified-partial');
  }, [savedOrderId, savedOrderNumber, cartItems, currentStore, customer, phone, orderType, subtotal, tax, paymentMethod, total, pickupTime, scheduledDateTime, deliveryTimeType, scheduledDeliveryDateTime]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-orange-50">
      <TopBar 
        cartItemsCount={cartItems.length}
        cartTotal={total}
        customerInfo={customer}
        orderType={orderType}
        currentStep="checkout"
        onQuickAddClick={() => {}} // no-op to satisfy required prop
      />
      
      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto h-full">
          {/* Compact Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200">
              <Receipt className="h-5 w-5 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
            </div>
          </div>

          {/* Main Content - 2 Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Left Column - Customer Info & Payment Method */}
            <div className="space-y-3 h-full">
              {/* Customer Info - Compact */}
              <div className="bg-white rounded-xl shadow-lg p-3 border border-gray-200">
                <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h2>
                <div className="space-y-2">
                  {/* Customer Name */}
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <div className="p-1 rounded-lg bg-green-100">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-green-800 text-xs">{customer.name}</p>
                      <p className="text-xs text-gray-600">Customer</p>
                    </div>
                  </div>
                  
                  {/* Phone Number */}
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                    <div className="p-1 rounded-lg bg-blue-100">
                      <Phone className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{phone}</p>
                      <p className="text-xs text-gray-600">Phone</p>
                    </div>
                  </div>
                  
                  {/* Order Type & Timing */}
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                    <Clock className="h-3 w-3 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-gray-900 text-xs capitalize">{orderType}</p>
                      <p className="text-xs text-gray-600">
                        {orderType === 'pickup' 
                          ? (pickupTime === 'scheduled' && scheduledDateTime 
                              ? `Scheduled: ${new Date(scheduledDateTime).toLocaleString()}`
                              : 'ASAP: 15-25 minutes')
                          : orderType === 'delivery'
                            ? (deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime
                                ? `Scheduled: ${new Date(scheduledDeliveryDateTime).toLocaleString()}`
                                : 'ASAP: 30-45 minutes')
                            : 'Ready when prepared'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Delivery Address (if delivery order) */}
                  {orderType === 'delivery' && customer.address && (
                    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <MapPin className="h-3 w-3 text-gray-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Address</p>
                        <p className="text-xs text-gray-600">
                          {customer.address.street}
                          {customer.address.city && `, ${customer.address.city}`}
                          {customer.address.postalCode && `, ${customer.address.postalCode}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Payment Method - Compact */}
              <div className="bg-white rounded-xl shadow-lg p-3 border border-gray-200 flex-1 flex flex-col">
                <h2 className="text-base font-bold text-gray-900 mb-3">Payment Method</h2>
                
                <div className="grid gap-2 mb-3">
                  {paymentMethods.map(({ method, icon, title, description }) => (
                    <PaymentMethodCard
                      key={method}
                      method={method}
                      icon={icon}
                      title={title}
                      description={description}
                      isSelected={paymentMethod === method}
                      onClick={() => setPaymentMethod(method)}
                    />
                  ))}
                </div>

                {/* Discount Section */}
                <div className="bg-gray-50 rounded-lg p-2 mb-3">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Percent className="h-3 w-3" />
                    Discount
                  </h3>
                  
                  {/* Discount Code Input */}
                  <div className="mb-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter discount code"
                        value={discountCode}
                        onChange={(e) => handleDiscountCodeChange(e.target.value)}
                        className="flex-1"
                        disabled={isValidatingCode}
                      />
                      <Button
                        onClick={validateDiscountCode}
                        disabled={!discountCode.trim() || isValidatingCode}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isValidatingCode ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                    {discountCodeError && (
                      <p className="text-red-600 text-xs mt-1">{discountCodeError}</p>
                    )}
                    {appliedDiscountCode && (
                      <div className="flex items-center justify-between mt-1 p-1 bg-green-50 rounded text-xs">
                        <span className="text-green-800">
                          ✓ {appliedDiscountCode.name} applied
                        </span>
                        <button
                          onClick={removeDiscountCode}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Manual Discount Percentage */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Discount %"
                      value={discountPercent}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      className="flex-1"
                      min="0"
                      max="100"
                      disabled={!!appliedDiscountCode}
                    />
                    <span className="flex items-center text-gray-600 text-sm">%</span>
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-red-600 text-xs mt-1">
                      Discount applied: -${discountAmount.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 mt-auto flex-shrink-0">
                  {/* Back to Menu and Pay button row */}
                  {!showReceiptOptions && (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={handleGoBack}
                        className="flex-1"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Menu
                      </Button>
                      <Button
                        onClick={handleProcessPayment}
                        disabled={isProcessing || orderSaved}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay ${total.toFixed(2)}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {/* Receipt Action Buttons - only show after payment */}
                  {showReceiptOptions && (
                    <div className="flex flex-col md:flex-row gap-2 w-full min-w-0">
                      {editingOrderId ? (
                        <>
                          <Button
                            onClick={printFullReceipt}
                            variant="outline"
                            className="flex-1"
                            disabled={!savedOrderId || !savedOrderNumber}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Full Receipt
                          </Button>
                          <Button
                            onClick={printModifiedReceipt}
                            variant="outline"
                            className="flex-1"
                            disabled={!savedOrderId || !savedOrderNumber}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Modified Receipt
                          </Button>
                          <Button
                            onClick={() => {
                              clearCart();
                              navigate('/customer-lookup');
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            Start New Order
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={async () => {
                              if (!savedOrderId || !savedOrderNumber) return;
                              const orderForPrint: Order = {
                                id: savedOrderId,
                                storeId: currentStore?.id ?? '',
                                storeName: currentStore?.name ?? '',
                                orderNumber: savedOrderNumber,
                                customerInfo: {
                                  name: customer.name,
                                  phone: phone,
                                },
                                items: cartItems.map(item => ({
                                  name: item.name,
                                  quantity: item.quantity,
                                  price: item.price,
                                  modifiers: [],
                                  extraCharges: item.extraCharges || 0,
                                  customizations: item.customizations,
                                })),
                                total: total,
                                createdAt: Date.now(),
                                storeAddress: currentStore?.address ?? '',
                                storePhone: currentStore?.phone ?? '',
                                orderType: orderType,
                                subtotal: subtotal,
                                tax: tax,
                                paymentMethod: paymentMethod,
                                // Include scheduled order information - using correct Firebase structure
                                pickupDetails: orderType === 'pickup' ? {
                                  estimatedTime: '15-25 minutes',
                                  ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {})
                                } : undefined,
                                deliveryDetails: orderType === 'delivery' ? {
                                  ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}),
                                  ...(customer.address ? {
                                    street: customer.address.street,
                                    city: customer.address.city,
                                    postalCode: customer.address.postalCode
                                  } : {})
                                } : undefined,
                              };
                              await printReceiptIfLocal(orderForPrint, currentStore?.id ?? '', 'new');
                            }}
                            variant="outline"
                            className="flex-1"
                            disabled={!savedOrderId || !savedOrderNumber}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Receipt
                          </Button>
                          <Button
                            onClick={() => {
                              clearCart();
                              navigate('/customer-lookup');
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            Start New Order
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  {/* Payment status message */}
                  {showReceiptOptions && (
                    <div className="flex items-center gap-2 text-red-600 justify-center py-2">
                      <Check className="h-5 w-5" />
                      <span className="font-semibold">Payment Successful!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 h-full flex flex-col">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 flex-shrink-0">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </h2>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <OrderSummary 
                    cartItems={cartItems} 
                    subtotal={subtotal} 
                    tax={tax} 
                    discount={discountAmount} 
                    total={total} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modal for modification prompt - DEPRECATED: Now using direct update */}
      {/* {showModificationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
            <h2 className="text-lg font-bold mb-4">Send full order or only modified items?</h2>
            <p className="mb-6">Would you like to send the <span className="font-semibold">full order</span> to the kitchen, or <span className="font-semibold">only the modified items</span>?</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => handleModificationPromptChoice('full')} className="bg-red-600 hover:bg-red-700 text-white">Full Order</Button>
              <Button onClick={() => handleModificationPromptChoice('modified')} className="bg-blue-600 hover:bg-blue-700 text-white">Only Modified Items</Button>
            </div>
          </div>
        </div>
      )} */}
      {/* Modal for order success */}
      {showOrderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
            <h2 className="text-lg font-bold mb-4">Order Updated Successfully!</h2>
            <p className="mb-6">Your order has been updated successfully.</p>
            <Button
              onClick={() => {
                setShowOrderSuccess(false);
                navigate('/customer-lookup');
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Continue to Customer Lookup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage; 