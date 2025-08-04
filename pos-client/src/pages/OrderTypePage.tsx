import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TopBar } from '../components/layout/TopBar';
import { PreviousOrdersDialog } from '../components/PreviousOrdersDialog';
import { Package, Truck, Store, Clock, MapPin, CheckCircle, User, ArrowRight, History } from 'lucide-react';
import { cn } from '../utils/cn';
import { Customer } from '../data/customers';
import { getPreviousOrdersForCustomer, PreviousOrder } from '../data/previousOrders';
import { useCart } from '../context/CartContext';

// Define Order interface to match PreviousOrdersDialog
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
  items: any[];
  orderType?: string;
}

// Memoized components to prevent unnecessary re-renders
const OrderTypeCard = memo(({ 
  type, 
  icon: Icon, 
  title, 
  description, 
  features, 
  isSelected, 
  isKeyboardSelected, 
  onClick 
}: {
  type: 'pickup' | 'delivery';
  icon: React.ComponentType<any>;
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
  >
    <div className={cn(
      "w-12 h-12 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-3 transition-transform duration-150 shadow-lg",
      {
        "bg-gradient-to-br from-red-700 to-red-800 group-hover:scale-105": type === 'pickup',
        "bg-gradient-to-br from-orange-600 to-orange-700 group-hover:scale-105": type === 'delivery'
      }
    )}>
      <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
    </div>
    
    <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-1 lg:mb-2">{title}</h3>
    <p className="text-gray-600 mb-2 lg:mb-3 text-sm lg:text-base">{description}</p>
    
    <div className="space-y-1 text-sm text-gray-500">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span>{feature}</span>
        </div>
      ))}
    </div>
    
    {isSelected && (
      <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
        <CheckCircle className="h-4 w-4" />
        <span className="font-semibold text-sm">Selected!</span>
      </div>
    )}
    
    {isKeyboardSelected && !isSelected && (
      <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
        <div className="h-4 w-4 border-2 border-red-600 rounded-full animate-pulse" />
        <span className="font-semibold text-sm">Press Enter to Select</span>
      </div>
    )}
  </button>
));

OrderTypeCard.displayName = 'OrderTypeCard';

const CustomerInfoCard = memo(({ 
  customer, 
  phone, 
  onNavigateToCustomerLookup,
  onShowPreviousOrders 
}: {
  customer: Customer | null;
  phone: string;
  onNavigateToCustomerLookup: () => void;
  onShowPreviousOrders: () => void;
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-6">
      <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
        <User className="h-5 w-5 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
    </div>
    
    <div className="flex-1 flex flex-col justify-center">
      {!customer ? (
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              New customer detected
            </p>
            <p className="text-xs text-yellow-700">Please enter their name to continue.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
            <Input 
              placeholder="Enter customer name..."
              className="w-full"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Enhanced Customer Status Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 opacity-10 rounded-full -mr-8 -mt-8"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-600 rounded-full">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <p className="font-bold text-green-800 text-sm">
                    {customer.orderCount > 0 ? 'Welcome back!' : 'New customer!'}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onNavigateToCustomerLookup} 
                  className="text-green-700 hover:bg-green-100 text-xs px-2 py-1"
                >
                  Not them?
                </Button>
              </div>
              <div className="mb-3">
                <p className="text-xl font-bold text-gray-900 mb-1">{customer.name}</p>
                <p className="text-sm text-gray-600">
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
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 p-3">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 opacity-10 rounded-full -mr-4 -mt-4"></div>
              <div className="relative">
                <p className="text-red-600 font-medium text-xs mb-1">Phone</p>
                <p className="text-lg font-bold text-gray-900">{phone}</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-3">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 opacity-10 rounded-full -mr-4 -mt-4"></div>
              <div className="relative">
                <p className="text-orange-600 font-medium text-xs mb-1">Past Orders</p>
                <p className="text-lg font-bold text-gray-900">{customer.orderCount}</p>
              </div>
            </div>
          </div>
          
          {customer.orderCount > 0 && (
            <div className="mt-4">
              <Button
                onClick={onShowPreviousOrders}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <History className="h-4 w-4" />
                View Previous Orders
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

  // Pre-fetch previous orders when customer is loaded
  const preFetchPreviousOrders = useCallback(async (customerPhone: string) => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    
    // Check cache first
    if (previousOrdersCache.has(cleanPhone)) {
      return;
    }
    
    try {
      // Pre-fetch in background without blocking UI
      const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');

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
  }, [customer?.name, previousOrdersCache]);

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

  // Memoized handlers
  const handleOrderTypeSelect = useCallback((type: 'pickup' | 'delivery') => {
    setSelectedType(type);
    
    const finalCustomerData = customer || { name: customerName, phone };
    navigate(`/order/${type}-details`, { 
      state: { 
        customer: finalCustomerData, 
        phone 
      } 
    });
  }, [customer, customerName, phone, navigate]);

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
        console.log('🔍 Fetching previous orders for:', customer.name, phone);
        
        // Use optimized Firebase query
        const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');

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
          
          console.log('🎯 Most recent order to display:', JSON.stringify(orderData, null, 2));
          
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
      } finally {
        setIsLoadingPreviousOrders(false);
      }
    }
  }, [customer, phone, previousOrdersCache]);

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
      console.log('🔄 Processing reorder for:', order);
      
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
      
      console.log('✅ Reorder completed - navigating to order type selection');
      
    } catch (error) {
      console.error('❌ Error processing reorder:', error);
      alert('Error loading previous order. Please try again.');
    }
  }, [addToCart, clearCart, navigate]);

  // Memoized derived state
  const isCustomerInfoConfirmed = useMemo(() => 
    customer !== null || (customer === null && customerName.trim() !== ''),
    [customer, customerName]
  );

  // Memoized order type data
  const orderTypeData = useMemo(() => [
    {
      type: 'pickup' as const,
      icon: Package,
      title: 'Pickup',
      description: 'Ready in 15-25 minutes',
      features: [
        'Faster service',
        'Pick up at store'
      ]
    },
    {
      type: 'delivery' as const,
      icon: Truck,
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
                <Store className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
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
                onNavigateToCustomerLookup={handleNavigateToCustomerLookup}
                onShowPreviousOrders={handleShowPreviousOrders}
              />
            </div>

            {/* Order Type Selection */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 border border-gray-100 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 lg:mb-6">
                  <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg lg:text-xl font-bold text-gray-900">How would you like to receive your order?</h2>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {orderTypeData.map((orderType, index) => (
                      <OrderTypeCard
                        key={orderType.type}
                        type={orderType.type}
                        icon={orderType.icon}
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
    </div>
  );
};

export default memo(OrderTypePage);