import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TopBar } from '../components/layout/TopBar';
import { PreviousOrdersDialog } from '../components/PreviousOrdersDialog';
import { Store, Clock, CheckCircle, User, History, AlertTriangle, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Customer } from '../data/customers';
import pickupImage from '../assets/pickup.png';
import deliveryImage from '../assets/pizza-deliver.png';

import { useCart } from '../context/CartContext';

// Define Order interface to match PreviousOrdersDialog
interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  extraCharges?: number;
  customizations?: any;
  comboItems?: OrderItem[];
  imageUrl?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  timestamp: number;
  total: number;
  status: 'pending' | 'completed' | 'unknown';
  source?: 'online' | 'pos';
  customerInfo?: {
    name: string;
    phone: string;
  };
  items: OrderItem[];
  orderType?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pending';
}

// Error dialog component for better UX
const ErrorDialog = ({ 
  isOpen, 
  onClose, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-red-700 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Memoized components to prevent unnecessary re-renders
const OrderTypeCard = memo(({ 
  type, 
  image, 
  title, 
  description, 
  features, 
  isSelected, 
  isKeyboardSelected, 
  onClick 
}: {
  type: 'pickup' | 'delivery';
  image: string;
  title: string;
  description: string;
  features: string[];
  isSelected: boolean;
  isKeyboardSelected?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative rounded-lg lg:rounded-xl border-2 p-4 lg:p-6 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 text-center h-full",
      {
        "border-red-600 bg-red-50 shadow-lg": isSelected,
        "border-red-500 bg-red-50 shadow-md ring-2 ring-red-200": isKeyboardSelected && !isSelected,
        "border-gray-200 hover:border-red-300 hover:shadow-md": !isSelected && !isKeyboardSelected,
      }
    )}
    aria-label={`Select ${title} order type`}
    aria-pressed={isSelected}
  >
    <div className={cn(
      "w-16 h-16 lg:w-20 lg:h-20 rounded-lg lg:rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-3 transition-transform duration-150 shadow-lg overflow-hidden bg-white group-hover:scale-105"
    )}>
      <img 
        src={image} 
        alt={`${title} icon`}
        className="h-10 w-10 lg:h-12 lg:w-12 object-contain"
      />
    </div>
    
    <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-1 lg:mb-2">{title}</h3>
    <p className="text-gray-600 mb-2 lg:mb-3 text-sm lg:text-base">{description}</p>
    
    <div className="space-y-1 text-sm text-gray-500">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" aria-hidden="true" />
          <span>{feature}</span>
        </div>
      ))}
    </div>
    
    {isSelected && (
      <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        <span className="font-semibold text-sm">Selected!</span>
      </div>
    )}
    
    {isKeyboardSelected && !isSelected && (
      <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
        <div className="h-4 w-4 border-2 border-red-600 rounded-full animate-pulse" aria-hidden="true" />
        <span className="font-semibold text-sm">Press Enter to Select</span>
      </div>
    )}
  </button>
));

OrderTypeCard.displayName = 'OrderTypeCard';

const CustomerInfoCard = memo(({ 
  customer, 
  phone, 
  customerName,
  onCustomerNameChange,
  onNavigateToCustomerLookup,
  onShowPreviousOrders 
}: {
  customer: Customer | null;
  phone: string;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  onNavigateToCustomerLookup: () => void;
  onShowPreviousOrders: () => void;
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-6">
      <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
        <User className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
    </div>
    
    <div className="flex-1 flex flex-col justify-center">
      {!customer ? (
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              New customer detected
            </p>
            <p className="text-xs text-yellow-700">Please enter their name to continue.</p>
          </div>
          <div>
            <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name
            </label>
            <Input 
              id="customer-name"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Enter customer name..."
              className="w-full"
              aria-describedby="customer-name-help"
            />
            <p id="customer-name-help" className="text-xs text-gray-500 mt-1">
              Enter the customer's full name to continue
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Enhanced Customer Status Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 opacity-10 rounded-full -mr-8 -mt-8"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-full shadow-sm">
                    <CheckCircle className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-green-800 text-base leading-tight">
                      {customer.orderCount > 0 ? 'Welcome back!' : 'New customer!'}
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      {customer.orderCount > 0 ? 'We\'re glad to see you again' : 'Let\'s get you started'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onNavigateToCustomerLookup} 
                  className="text-green-700 hover:bg-green-100 text-xs px-3 py-1.5 font-medium"
                  aria-label="Change customer"
                >
                  Not them?
                </Button>
              </div>
              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{customer.name}</p>
                <p className="text-sm text-gray-600 font-medium">
                  {customer.orderCount > 0 
                    ? `Customer since ${new Date(customer.lastOrderDate).getFullYear()}`
                    : 'First time ordering'
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Enhanced Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 p-4">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 opacity-10 rounded-full -mr-4 -mt-4"></div>
              <div className="relative">
                <p className="text-red-600 font-semibold text-xs mb-2 uppercase tracking-wide">Phone</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{phone}</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 opacity-10 rounded-full -mr-4 -mt-4"></div>
              <div className="relative">
                <p className="text-orange-600 font-semibold text-xs mb-2 uppercase tracking-wide">Past Orders</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{customer.orderCount}</p>
              </div>
            </div>
          </div>
          
          {customer.orderCount > 0 && (
            <div className="mt-4">
              <Button
                onClick={onShowPreviousOrders}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                aria-label="View previous orders"
              >
                <History className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm">View Previous Orders</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
));

CustomerInfoCard.displayName = 'CustomerInfoCard';

const OrderTypePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, clearCart, getCartItemCount, getCartTotal } = useCart();
  
  const { customer: initialCustomer, phone } = location.state || {};

  // State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [selectedType, setSelectedType] = useState<'pickup' | 'delivery' | null>(null);
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(0); // For keyboard navigation
  const [showPreviousOrders, setShowPreviousOrders] = useState(false);
  const [previousOrders, setPreviousOrders] = useState<Order[]>([]);
  const [isLoadingPreviousOrders, setIsLoadingPreviousOrders] = useState(false);
  const [previousOrdersCache, setPreviousOrdersCache] = useState<Map<string, Order[]>>(new Map());
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Memoized Firebase imports to avoid repeated dynamic imports
  const firebaseImports = useMemo(async () => {
    const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    return { collection, query, where, getDocs, orderBy, limit, db };
  }, []);

  // Pre-fetch previous orders when customer is loaded
  const preFetchPreviousOrders = useCallback(async (customerPhone: string) => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    
    // Check cache first
    if (previousOrdersCache.has(cleanPhone)) {
      return;
    }
    
    try {
      const { collection, query, where, getDocs, orderBy, limit, db } = await firebaseImports;

      // Optimized query - only get the most recent order
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customerInfo.phone', '==', cleanPhone),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(ordersQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const orderData = doc.data();
        
        const order: Order = {
          id: doc.id,
          orderNumber: orderData.orderNumber || doc.id,
          timestamp: orderData.timestamp || orderData.createdAt || Date.now(),
          total: orderData.total || 0,
          status: orderData.status || 'completed',
          source: orderData.source || 'pos',
          customerInfo: orderData.customerInfo || { name: customer?.name || '', phone: cleanPhone },
          items: orderData.items || [],
          orderType: orderData.orderType || 'pickup'
        };
        
        // Cache the result
        setPreviousOrdersCache(prev => new Map(prev).set(cleanPhone, [order]));
      } else {
        // Cache empty result
        setPreviousOrdersCache(prev => new Map(prev).set(cleanPhone, []));
      }
    } catch (error) {
      console.error('❌ Error pre-fetching previous orders:', error);
      // Cache empty result on error
      setPreviousOrdersCache(prev => new Map(prev).set(cleanPhone, []));
    }
  }, [customer?.name, previousOrdersCache, firebaseImports]);

  // Effect to handle customer initialization
  useEffect(() => {
    if (!phone) {
      navigate('/customer-lookup');
      return;
    }
    if (initialCustomer) {
      setCustomer(initialCustomer);
      setCustomerName(initialCustomer.name);
      // Pre-fetch previous orders immediately
      preFetchPreviousOrders(phone);
    } else {
      setCustomer(null);
      setCustomerName('');
    }
  }, [initialCustomer, phone, navigate, preFetchPreviousOrders]);

  // Handle customer name changes
  const handleCustomerNameChange = useCallback((name: string) => {
    setCustomerName(name);
  }, []);

  // Memoized derived state
  const isCustomerInfoConfirmed = useMemo(() => 
    customer !== null || (customer === null && customerName.trim() !== ''),
    [customer, customerName]
  );

  // Memoized handlers
  const handleOrderTypeSelect = useCallback((type: 'pickup' | 'delivery') => {
    if (!isCustomerInfoConfirmed) {
      setErrorDialog({
        isOpen: true,
        title: 'Customer Information Required',
        message: 'Please enter the customer name before selecting an order type.'
      });
      return;
    }

    setSelectedType(type);
    
    const finalCustomerData = customer || { name: customerName, phone };
    navigate(`/order/${type}-details`, { 
      state: { 
        customer: finalCustomerData, 
        phone 
      } 
    });
  }, [customer, customerName, phone, navigate, isCustomerInfoConfirmed]);

  const handleNavigateToCustomerLookup = useCallback(() => {
    navigate('/customer-lookup');
  }, [navigate]);

  const handleShowPreviousOrders = useCallback(async () => {
    if (customer) {
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Show dialog immediately with cached data if available
      const cachedOrders = previousOrdersCache.get(cleanPhone);
      if (cachedOrders !== undefined) {
        setPreviousOrders(cachedOrders);
        setShowPreviousOrders(true);
        return;
      }
      
      // If not cached, show loading state immediately
      setIsLoadingPreviousOrders(true);
      setShowPreviousOrders(true);
      setPreviousOrders([]);
      
      try {
        const { collection, query, where, getDocs, orderBy, limit, db } = await firebaseImports;

        // Single optimized query - only get the most recent order
        const ordersQuery = query(
          collection(db, 'orders'),
          where('customerInfo.phone', '==', cleanPhone),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const snapshot = await getDocs(ordersQuery);
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const orderData = doc.data();
          
          const order: Order = {
            id: doc.id,
            orderNumber: orderData.orderNumber || doc.id,
            timestamp: orderData.timestamp || orderData.createdAt || Date.now(),
            total: orderData.total || 0,
            status: orderData.status || 'completed',
            source: orderData.source || 'pos',
            customerInfo: orderData.customerInfo || { name: customer.name, phone: cleanPhone },
            items: orderData.items || [],
            orderType: orderData.orderType || 'pickup'
          };
          
          setPreviousOrders([order]);
          
          // Cache the result for future use
          setPreviousOrdersCache(prev => new Map(prev).set(cleanPhone, [order]));
        } else {
          setPreviousOrders([]);
          // Cache empty result
          setPreviousOrdersCache(prev => new Map(prev).set(cleanPhone, []));
        }
      } catch (error) {
        console.error('❌ Error fetching previous orders:', error);
        setPreviousOrders([]);
        // Cache empty result on error
        setPreviousOrdersCache(prev => new Map(prev).set(cleanPhone, []));
        
        setErrorDialog({
          isOpen: true,
          title: 'Error Loading Orders',
          message: 'Failed to load previous orders. Please try again.'
        });
      } finally {
        setIsLoadingPreviousOrders(false);
      }
    }
  }, [customer, phone, previousOrdersCache, firebaseImports]);

  // Helper to normalize order items for cart reordering (same as modify order)
  const normalizeOrderItemsForCart = (orderItems: any[]): any[] => {
    return orderItems.map(item => {
      // If combo customizations are an object with numeric keys, convert to array
      if (item.customizations && typeof item.customizations === 'object' && !Array.isArray(item.customizations) && Object.keys(item.customizations).every(k => !isNaN(Number(k)))) {
        const customizationsArr = Object.values(item.customizations);
        return {
          ...item,
          isCombo: true,
          customizations: customizationsArr,
        };
      }
      // If combo customizations are already an array, just ensure isCombo is true
      if ((item.isCombo || Array.isArray(item.customizations)) && Array.isArray(item.customizations)) {
        return {
          ...item,
          isCombo: true,
        };
      }
      // For non-combo, just return as-is
      return { ...item };
    });
  };

  const handleReorder = useCallback((order: any) => {
    try {
      // Use the exact same logic as modify order
      const normalized = normalizeOrderItemsForCart(order.items);
      
      // Clear existing cart to start fresh
      clearCart();
      
      // Add normalized items to cart
      normalized.forEach(item => {
        addToCart(item);
      });
      
      // Store original items for modification tracking (same as modify order)
      localStorage.setItem('originalOrderItems', JSON.stringify(normalized));
      
      // Close the previous orders dialog
      setShowPreviousOrders(false);
      
      // Navigate to order type selection (same flow as new order)
      // This allows customer to choose pickup/delivery regardless of original order type
      navigate('/order', {
        state: {
          customer: order.customerInfo,
          phone: order.customerInfo?.phone,
          editingOrderId: order.id, // Pass the order ID for modification mode
          orderNumber: order.orderNumber,
          originalOrder: order, // Pass the full original order for receipt diff
          isReorder: true, // Flag to indicate this is a reorder
          originalOrderType: order.orderType // Store original type for reference
        }
      });
      
    } catch (error) {
      console.error('❌ Error processing reorder:', error);
      setErrorDialog({
        isOpen: true,
        title: 'Reorder Error',
        message: 'Error loading previous order. Please try again.'
      });
    }
  }, [addToCart, clearCart, navigate]);

  // Memoized order type data
  const orderTypeData = useMemo(() => [
    {
      type: 'pickup' as const,
      image: pickupImage,
      title: 'Pickup',
      description: 'Ready in 15-25 minutes',
      features: [
        'Faster service',
        'Pick up at store'
      ]
    },
    {
      type: 'delivery' as const,
      image: deliveryImage,
      title: 'Delivery',
      description: 'Delivered in 30-45 minutes',
      features: [
        'Delivered to your door',
        'Convenient service'
      ]
    }
  ], []);

  // Keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCustomerInfoConfirmed) return; // Don't allow navigation if customer info not confirmed

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setKeyboardSelectedIndex(0); // Pickup
          break;
        case 'ArrowRight':
          e.preventDefault();
          setKeyboardSelectedIndex(1); // Delivery
          break;
        case 'Enter':
          e.preventDefault();
          const selectedOrderType = orderTypeData[keyboardSelectedIndex];
          if (selectedOrderType) {
            handleOrderTypeSelect(selectedOrderType.type);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardSelectedIndex, orderTypeData, handleOrderTypeSelect, isCustomerInfoConfirmed]);

  if (!phone) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-orange-50">
      <TopBar 
        cartItemsCount={getCartItemCount()}
        cartTotal={getCartTotal()}
        customerInfo={customer}
        orderType="Selection"
        currentStep="orderType"
        onQuickAddClick={() => navigate('/menu')}
      />
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 pt-4 lg:pt-6">
        <div className="w-full max-w-7xl mx-auto space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 lg:gap-3 mb-2 lg:mb-4">
              <div className="p-2 lg:p-3 bg-gradient-to-br from-red-800 to-red-900 rounded-xl lg:rounded-2xl shadow-lg">
                <Store className="h-6 w-6 lg:h-8 lg:w-8 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent">
                {customer?.name 
                  ? customer.orderCount > 0 
                    ? `Welcome back, ${customer.name}!` 
                    : `New Order for ${customer.name}`
                  : `New Order for ${phone}`
                }
              </h1>
            </div>
            <p className="text-gray-600 text-base lg:text-lg max-w-2xl mx-auto px-4">
            Verify customer and choose order type.
            </p>
            {isCustomerInfoConfirmed && (
              <p className="text-gray-500 text-sm mt-2 flex items-center justify-center gap-2">
                <span className="hidden lg:inline">Use ← → arrows to navigate, Enter to select</span>
                <span className="lg:hidden">Use arrows & Enter to select</span>
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
            {/* Customer Information */}
            <div className="lg:col-span-1">
              <CustomerInfoCard
                customer={customer}
                phone={phone}
                customerName={customerName}
                onCustomerNameChange={handleCustomerNameChange}
                onNavigateToCustomerLookup={handleNavigateToCustomerLookup}
                onShowPreviousOrders={handleShowPreviousOrders}
              />
            </div>

            {/* Order Type Selection */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 border border-gray-100 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 lg:mb-6">
                  <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
                    <Store className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg lg:text-xl font-bold text-gray-900">How would you like to receive your order?</h2>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {orderTypeData.map((orderType, index) => (
                      <OrderTypeCard
                        key={orderType.type}
                        type={orderType.type}
                        image={orderType.image}
                        title={orderType.title}
                        description={orderType.description}
                        features={orderType.features}
                        isSelected={selectedType === orderType.type}
                        isKeyboardSelected={keyboardSelectedIndex === index}
                        onClick={() => handleOrderTypeSelect(orderType.type)}
                      />
                    ))}
                  </div>

                  {/* Confirmation Requirements */}
                  {!isCustomerInfoConfirmed && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-center font-medium">
                        Please confirm customer information before selecting order type.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Previous Orders Dialog */}
      <PreviousOrdersDialog
        open={showPreviousOrders}
        onOpenChange={setShowPreviousOrders}
        customerName={customer?.name || ''}
        orders={previousOrders}
        onReorder={handleReorder}
        isLoading={isLoadingPreviousOrders}
      />

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
        title={errorDialog.title}
        message={errorDialog.message}
      />
    </div>
  );
};

export default memo(OrderTypePage);