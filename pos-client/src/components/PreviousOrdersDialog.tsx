import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Clock, ShoppingBag, ArrowRight, X, User, Phone, Calendar } from 'lucide-react';

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
  return `$${price.toFixed(2)}`;
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
        details.push(`Extra Charge: $${Number(step.extraCharge).toFixed(2)}`);
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
      details.push(`Extra Charge: $${Number(customizations.extraCharge).toFixed(2)}`);
    }
  }

  return details;
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
        <DialogContent className="max-w-lg w-full bg-white rounded-xl shadow-xl border-0 p-0 overflow-hidden">
          <DialogTitle className="sr-only">Loading Previous Order</DialogTitle>
          <DialogDescription className="sr-only">Loading previous order for {customerName}</DialogDescription>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{customerName}'s Recent Order</h2>
                <p className="text-red-100 text-xs mt-1">Loading...</p>
              </div>
            </div>
          </div>

          {/* Loading Content */}
          <div className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <p className="text-gray-600 text-sm">Loading previous order...</p>
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
        <DialogContent className="max-w-lg w-full bg-white rounded-xl shadow-xl border-0 p-0 overflow-hidden">
          <DialogTitle className="sr-only">No Previous Orders</DialogTitle>
          <DialogDescription className="sr-only">No previous orders found for {customerName}</DialogDescription>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{customerName}'s Orders</h2>
                <p className="text-red-100 text-xs mt-1">No previous orders found</p>
              </div>
            </div>
          </div>

          {/* No Orders Content */}
          <div className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <ShoppingBag className="h-8 w-8 text-gray-400" />
                <p className="text-gray-600 text-sm">No previous orders found for this customer.</p>
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
      <DialogContent className="max-w-lg w-full bg-white rounded-xl shadow-xl border-0 p-0 overflow-hidden max-h-[80vh]">
        <DialogTitle className="sr-only">{customerName}'s Most Recent Order</DialogTitle>
        <DialogDescription className="sr-only">Quickly reorder their last order</DialogDescription>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{customerName}'s Recent Order</h2>
              <p className="text-red-100 text-xs mt-1">Quickly reorder their last order</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-140px)]">
          <div className="p-4 space-y-3">
            {/* Order Info - Compact */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-900 text-sm">
                    #{order.orderNumber}
                  </span>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  {order.status === 'completed' ? 'Completed' : order.status}
                </span>
              </div>
              
              {/* Date, Time, Customer - Compact */}
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{orderDate}</span>
                </div>
                {orderTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{orderTime}</span>
                  </div>
                )}
                {order.customerInfo && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{order.customerInfo.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary - Compact */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">Order Summary</h3>
                <div className="text-right">
                  <div className="text-base font-bold text-gray-900">{formatPrice(order.total)}</div>
                  <div className="text-xs text-gray-500">{order.items.length} items</div>
                </div>
              </div>

              {/* Order Items - Compact */}
              <div className="space-y-2">
                {order.items.slice(0, 2).map((item, index) => {
                  const customizationDetails = renderCustomizationDetails(item.customizations, item.comboItems);
                  
                  return (
                    <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                      {/* Item image */}
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium text-gray-900 text-sm ml-2">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        
                        {item.size && (
                          <div className="text-xs text-gray-600 mt-1">
                            Size: {item.size}
                          </div>
                        )}
                        
                        {/* Display detailed customizations - Compact */}
                        {customizationDetails && customizationDetails.length > 0 && (
                          <div className="mt-1">
                            <div className="space-y-1">
                              {customizationDetails.slice(0, 3).map((detail, idx) => (
                                <div key={idx} className="text-xs text-gray-700 bg-blue-50 px-2 py-1 rounded">
                                  {detail}
                                </div>
                              ))}
                              {customizationDetails.length > 3 && (
                                <div className="text-xs text-gray-500 italic">
                                  +{customizationDetails.length - 3} more...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {order.items.length > 2 && (
                  <div className="text-center py-1">
                    <span className="text-xs text-gray-500 italic">
                      +{order.items.length - 2} more items...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Type Notice - Compact */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-blue-800">
                  <strong>Order Type:</strong> {order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                You can change this when you proceed to checkout
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Compact */}
        <div className="bg-gray-50 px-4 py-3 border-t">
          <Button
            onClick={() => onReorder(order)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            Reorder This Order
          </Button>
          <p className="text-center text-xs text-gray-500 mt-1">
            Showing most recent order
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 