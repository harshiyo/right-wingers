import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Clock, ShoppingBag, ArrowRight, User, Calendar, MapPin, CreditCard, CheckCircle, AlertCircle, Clock as ClockIcon } from 'lucide-react';

// Use the same order interface as modify order functionality
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

interface PreviousOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  orders: Order[];
  onReorder: (order: Order) => void;
  isLoading?: boolean;
}

const formatDate = (timestamp: number) => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Unknown Date';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'Unknown Date';
  }
};

const formatTime = (timestamp: number) => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return '';
  }
};

const formatPrice = (price: number) => {
  // Handle edge cases and ensure we always get exactly 2 decimal places
  if (typeof price !== 'number' || isNaN(price)) {
    return '$0.00';
  }
  
  // Convert to string first to handle floating point precision issues
  const priceStr = price.toString();
  const roundedPrice = Math.round(parseFloat(priceStr) * 100) / 100;
  
  return `$${roundedPrice.toFixed(2)}`;
};

// Helper function to render customization details - using same logic as OrderNotificationDialog
const renderCustomizationDetails = (customizations: any, comboItems?: any[]) => {
  if (!customizations && !comboItems) return null;

  const details: string[] = [];

  // Handle processed customizations (string array from previousOrders.ts)
  if (Array.isArray(customizations) && customizations.length > 0) {
    // If customizations is already a string array (processed by extractCustomizations)
    if (customizations.every(c => typeof c === 'string')) {
      return customizations;
    }
  }

  // Use the exact same logic as OrderNotificationDialog
  // Combo: customizations as array or object with numeric keys
  let comboArr = null;
  if (Array.isArray(customizations)) comboArr = customizations;
  else if (customizations && typeof customizations === 'object' && Object.keys(customizations).every(k => !isNaN(Number(k)))) {
    comboArr = Object.values(customizations);
  }

  if (comboArr && comboArr.length > 0) {
    // Handle combo items - same logic as OrderNotificationDialog
    comboArr.forEach((step: any) => {
      const stepType = step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : 'Item';
      const stepSize = step.size ? ` (${step.size})` : '';
      details.push(`${stepType}${stepSize}`);
      
      if (step.toppings) {
        const t = step.toppings;
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
      
      if (step.sauces && step.sauces.length > 0) {
        details.push(`Sauces: ${step.sauces.map((sauce: any) => sauce.name).join(', ')}`);
      }
      
      if (step.instructions && step.instructions.length > 0) {
        details.push(`Instructions: ${step.instructions.join(', ')}`);
      }
      
             if (!isNaN(Number(step.extraCharge)) && Number(step.extraCharge) > 0) {
         details.push(`Extra Charge: ${formatPrice(Number(step.extraCharge))}`);
       }
    });
  } else if (customizations && typeof customizations === 'object') {
    // Handle regular item customizations - same logic as OrderNotificationDialog
    if (customizations.size) {
      details.push(`Size: ${customizations.size}`);
    }
    
    if (customizations.toppings) {
      const t = customizations.toppings;
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
    
    if (customizations.sauces && customizations.sauces.length > 0) {
      details.push(`Sauces: ${customizations.sauces.map((sauce: any) => sauce.name).join(', ')}`);
      }
    
    if (customizations.instructions && customizations.instructions.length > 0) {
      details.push(`Instructions: ${customizations.instructions.join(', ')}`);
    }
    
         if (customizations.extraCharge && Number(customizations.extraCharge) > 0) {
       details.push(`Extra Charge: ${formatPrice(Number(customizations.extraCharge))}`);
     }
  }

  return details;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'pending':
      return <ClockIcon className="w-4 h-4 text-yellow-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'unpaid':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'pending':
      return <ClockIcon className="w-4 h-4 text-yellow-600" />;
    default:
      return <CreditCard className="w-4 h-4 text-gray-600" />;
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'unpaid':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const PreviousOrdersDialog: React.FC<PreviousOrdersDialogProps> = ({
  open,
  onOpenChange,
  customerName,
  orders,
  onReorder,
  isLoading = false
}) => {
  if (!open) return null;

  // Show loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border-0 p-0 overflow-hidden">
          <DialogTitle className="sr-only">Loading Previous Order</DialogTitle>
          <DialogDescription className="sr-only">Loading previous order for {customerName}</DialogDescription>
          
          {/* Header */}
          <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{customerName}'s Recent Order</h2>
                  <p className="text-red-100 text-sm mt-1">Loading order details...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Content */}
          <div className="p-8">
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-600 animate-ping opacity-20"></div>
                </div>
                <p className="text-gray-600 text-base font-medium">Loading previous order...</p>
                <p className="text-gray-400 text-sm">Please wait while we fetch the details</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (orders.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border-0 p-0 overflow-hidden">
          <DialogTitle className="sr-only">No Previous Orders</DialogTitle>
          <DialogDescription className="sr-only">No previous orders found for {customerName}</DialogDescription>
          
          {/* Header */}
          <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{customerName}'s Orders</h2>
                  <p className="text-red-100 text-sm mt-1">No previous orders found</p>
                </div>
              </div>
            </div>
          </div>

          {/* No Orders Content */}
          <div className="p-8">
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-gray-100 rounded-full">
                  <ShoppingBag className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Previous Orders</h3>
                  <p className="text-gray-600 text-base">This customer hasn't placed any orders yet.</p>
                  <p className="text-gray-400 text-sm mt-1">Their first order will appear here for quick reordering.</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const order = orders[0]; // Show most recent order
  const orderDate = formatDate(order.timestamp);
  const orderTime = formatTime(order.timestamp);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border-0 p-0 overflow-hidden max-h-[85vh]">
        <DialogTitle className="sr-only">{customerName}'s Most Recent Order</DialogTitle>
        <DialogDescription className="sr-only">Quickly reorder their last order</DialogDescription>
        
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{customerName}'s Recent Order</h2>
                <p className="text-red-100 text-sm mt-1">Quickly reorder their last order</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatPrice(order.total)}</div>
              <div className="text-red-100 text-sm">{order.items.length} items</div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Order Info Card */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                {/* Order Number & Status */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ShoppingBag className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Number</p>
                      <p className="font-bold text-gray-900">#{order.orderNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status === 'completed' ? 'Completed' : order.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium text-gray-900">{orderDate}</p>
                    </div>
                  </div>
                  
                  {orderTime && (
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Clock className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Time</p>
                        <p className="font-medium text-gray-900">{orderTime}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info & Payment Status */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  {order.customerInfo && (
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        <p className="font-medium text-gray-900">{order.customerInfo.name}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.paymentStatus && (
                    <div className="flex items-center gap-2">
                      {getPaymentStatusIcon(order.paymentStatus)}
                      <div>
                        <p className="text-sm text-gray-600">Payment</p>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPaymentStatusColor(order.paymentStatus)}`}>
                          {order.paymentStatus === 'paid' ? 'Paid' : 
                           order.paymentStatus === 'unpaid' ? 'Unpaid' : 
                           'Pending'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Order Items
                </h3>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</div>
                  <div className="text-sm text-gray-500">{order.items.length} items</div>
                </div>
              </div>

              {/* Order Items - Simple Text Format */}
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const customizationDetails = renderCustomizationDetails(item.customizations, item.comboItems);
                  
                  return (
                    <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                      {/* Main Item Line */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {item.quantity}x {item.name}
                          {item.size && <span className="text-gray-500 ml-2">({item.size})</span>}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(item.price)}
                          {item.extraCharges && item.extraCharges > 0 && (
                            <span className="text-green-600 ml-1">+{formatPrice(item.extraCharges)}</span>
                          )}
                        </span>
                      </div>
                      
                      {/* Customizations in Simple Text */}
                      {customizationDetails && customizationDetails.length > 0 && (
                        <div className="ml-4 space-y-1">
                          {customizationDetails.map((detail, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
                              • {detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Type & Instructions Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">
                    Order Type: {order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                  </h4>
                  <p className="text-blue-700 text-sm">
                    You can modify the order type and delivery details when you proceed to checkout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
          <div className="space-y-3">
            <Button
              onClick={() => onReorder(order)}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-3 text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              <ArrowRight className="w-5 h-5" />
              Reorder This Order
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Showing most recent order • Total: {formatPrice(order.total)} • {order.items.length} items
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 