// ✅ Redesigned Order Notification Dialog Component
import { useState, useEffect } from 'react';
import { Clock, Package, CheckCircle, ChevronDown, X, Printer } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useStore } from '../../context/StoreContext';
import { cn } from '../../utils/cn';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { getPizzaInstructionLabels, getWingInstructionLabels } from '../../utils/cartHelpers';
import { useCollection } from 'react-firebase-hooks/firestore';

interface OrderNotificationDialogProps {
  open: boolean;
  onClose: () => void;
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
  // Scheduled order information - using correct Firebase structure
  pickupDetails?: {
    estimatedTime?: string;
    scheduledDateTime?: string;
  };
  deliveryDetails?: {
    scheduledDeliveryDateTime?: string;
  };
  // Legacy fields for backward compatibility
  pickupTime?: 'asap' | 'scheduled';
  scheduledDateTime?: string;
  deliveryTimeType?: 'asap' | 'scheduled';
  scheduledDeliveryDateTime?: string;
  estimatedPickupTime?: string;
  // Receipt fields
  subtotal?: number;
  tax?: number;
  paymentMethod?: string;
  deliveryAddress?: string;
}

interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  extraCharges?: number;
  customizations?: any;
  comboItems?: OrderItem[]; // Added for combo items
}

// Helper to normalize order items for cart editing
function normalizeOrderItemsForCart(orderItems: any[]): any[] {
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
    // For items with existing customizations object, preserve it
    if (item.customizations && typeof item.customizations === 'object') {
      const isComboItem = item.isCombo || Array.isArray(item.customizations);
      return {
        ...item,
        isCombo: isComboItem,
        customizations: item.customizations
      };
    }
    // For items without customizations, return as-is
    return { ...item };
  });
}

export const OrderNotificationDialog = ({ open, onClose }: OrderNotificationDialogProps) => {
     const [orders, setOrders] = useState<Order[]>([]);
   const [searchTerm, setSearchTerm] = useState('');
   const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
   const { currentStore } = useStore();
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');
  const { setCartItems } = useCart();
  const navigate = useNavigate();

  const [pizzaInstructionTiles] = useCollection(
    query(collection(db, 'pizzaInstructions'), orderBy('sortOrder'))
  );
  const [wingInstructionTiles] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );

  useEffect(() => {
    if (!currentStore?.id) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('storeId', '==', currentStore.id),
      where('timestamp', '>=', startOfDay.getTime()),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [currentStore?.id]);

        // ESC key to close dialog
   useEffect(() => {
     const handleKeyDown = (event: KeyboardEvent) => {
       if (!open) return;
       
       if (event.key === 'Escape') {
         onClose();
       }
     };

     if (open) {
       document.addEventListener('keydown', handleKeyDown);
     }

     return () => {
       document.removeEventListener('keydown', handleKeyDown);
     };
   }, [open, onClose]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  };

  const handleModifyOrder = (order: any) => {
    const normalized = normalizeOrderItemsForCart(order.items);
    setCartItems(normalized);
    // Store original items for modification tracking
    localStorage.setItem('originalOrderItems', JSON.stringify(normalized));
    
    // Extract scheduled information from the order
    let pickupTime = 'asap';
    let scheduledDateTime = undefined;
    let deliveryTimeType = 'asap';
    let scheduledDeliveryDateTime = undefined;
    
    if (order.orderType === 'pickup' && order.pickupDetails) {
      if (order.pickupDetails.scheduledDateTime) {
        pickupTime = 'scheduled';
        scheduledDateTime = order.pickupDetails.scheduledDateTime;
      }
    } else if (order.orderType === 'delivery' && order.deliveryDetails) {
      if (order.deliveryDetails.scheduledDeliveryDateTime) {
        deliveryTimeType = 'scheduled';
        scheduledDeliveryDateTime = order.deliveryDetails.scheduledDeliveryDateTime;
      }
    }
    
    // Pass customer info and phone to /menu so it is preselected
    navigate('/menu', {
      state: {
        customer: order.customerInfo,
        phone: order.customerInfo?.phone,
        orderType: order.orderType || 'pickup',
        editingOrderId: order.id, // Pass the order ID for modification mode
        orderNumber: order.orderNumber,
        originalOrder: order, // <-- Pass the full original order for receipt diff
        // Pass scheduled information
        pickupTime,
        scheduledDateTime,
        deliveryTimeType,
        scheduledDeliveryDateTime,
      }
    });
  };

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const markAsPaid = async (orderId: string) => {
    try {
      if (!currentStore?.id) {
        setNotification({ message: 'Store not found. Please try again.', type: 'error' });
        return;
      }
      
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { 
        paymentStatus: 'paid',
        updatedAt: new Date().toISOString()
      });
      
      // Show success message
      setNotification({ message: 'Order marked as paid successfully!', type: 'success' });
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error marking order as paid:', error);
      setNotification({ message: 'Failed to mark order as paid. Please try again.', type: 'error' });
      
      // Clear error notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Filter by status
  const statusFiltered = orderFilter === 'all'
    ? orders
    : orders.filter(order => order.status === orderFilter);

  // Filter by payment status
  const paymentFiltered = paymentFilter === 'all'
    ? statusFiltered
    : statusFiltered.filter(order => order.paymentStatus === paymentFilter);

  // Filter by search
  const filtered = paymentFiltered.filter(order => {
    const val = searchTerm.toLowerCase();
    return (
      order.customerInfo?.name?.toLowerCase().includes(val) ||
      order.customerInfo?.phone?.includes(searchTerm) ||
      order.orderNumber.includes(searchTerm)
    );
  });

  

  if (!open) return null;

           return (
            <div className="fixed inset-0 z-50 flex items-center justify-center order-notification-dialog p-4" tabIndex={-1}>
         <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${notification.type === 'success' ? 'text-green-100' : 'text-red-100'}`} />
            <span className="font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

             <div className="relative bg-white max-w-8xl w-full max-h-[98vh] rounded-2xl shadow-xl z-50 overflow-hidden">
         <div className="flex h-full">

           {/* Sidebar */}
           <div className="w-[220px] bg-gray-50 border-r p-4 space-y-2 flex-shrink-0">
             <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
               <Package className="w-4 h-4" /> Order Actions
             </h3>
             <button
               className={`w-full py-2 px-3 text-sm rounded-lg flex gap-2 items-center ${orderFilter === 'all' ? 'bg-red-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
               onClick={() => setOrderFilter('all')}
             >
               <Clock className="w-4 h-4" /> Today's Orders
             </button>
             <button
               className={`w-full py-2 px-3 text-sm rounded-lg flex gap-2 items-center ${orderFilter === 'completed' ? 'bg-green-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
               onClick={() => setOrderFilter('completed')}
             >
               <CheckCircle className="w-4 h-4" /> Completed
             </button>
             
             {/* Payment Status Filters */}
             <div className="border-t pt-3 mt-3">
               <h4 className="text-xs font-semibold text-gray-600 mb-2">Payment Status</h4>
               <button
                 className={`w-full py-2 px-3 text-sm rounded-lg flex gap-2 items-center ${paymentFilter === 'all' ? 'bg-gray-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
                 onClick={() => setPaymentFilter('all')}
               >
                 <Package className="w-4 h-4" /> All Payments
               </button>
               <button
                 className={`w-full py-2 px-3 text-sm rounded-lg flex gap-2 items-center ${paymentFilter === 'paid' ? 'bg-green-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
                 onClick={() => setPaymentFilter('paid')}
               >
                 <CheckCircle className="w-4 h-4" /> Paid
               </button>
               <button
                 className={`w-full py-2 px-3 text-sm rounded-lg flex gap-2 items-center ${paymentFilter === 'unpaid' ? 'bg-red-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
                 onClick={() => setPaymentFilter('unpaid')}
               >
                 <Package className="w-4 h-4" /> Unpaid
               </button>
               <button
                 className={`w-full py-2 px-3 text-sm rounded-lg flex gap-2 items-center ${paymentFilter === 'pending' ? 'bg-yellow-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
                 onClick={() => setPaymentFilter('pending')}
               >
                 <Clock className="w-4 h-4" /> Pending
               </button>
             </div>
            
            <button onClick={onClose} className="mt-auto w-full py-2 px-3 text-sm text-gray-800 hover:bg-gray-100 rounded-lg flex gap-2 items-center">
              <X className="w-4 h-4" /> Close
            </button>
          </div>

                                {/* Main Content */}
                       <div className="flex-1 flex flex-col p-6 max-h-[98vh] w-[1000px] h-[800px]">
             <div className="flex justify-between items-center mb-4">
               <div>
                 <h2 className="text-lg font-bold text-gray-800">Today's Orders</h2>
                 <p className="text-sm text-gray-500">
                   All orders placed today
                 </p>
               </div>
             </div>

             <div className="mb-4 relative">
               <input
                 type="text"
                 placeholder="Search orders..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
               />
             </div>

                           <div className="overflow-y-auto flex-1 space-y-3 pr-4 pl-2 min-h-0">
               {filtered.map((order, index) => (
                 <div 
                   key={order.id} 
                   className="bg-white rounded-xl shadow-md p-4 mb-4 border border-gray-200 transition-all duration-200 cursor-pointer"
                 >
                   <div className="flex justify-between items-center">
                     <div>
                       <div className="font-bold text-gray-900">Order #{order.orderNumber}</div>
                       <div className="text-xs text-gray-600">{formatTime(order.timestamp)} • {order.customerInfo?.name} • ${order.total.toFixed(2)}</div>
                       <div className="text-xs text-gray-500 mt-1">
                         {order.customerInfo?.phone && (
                           <span>Phone: {order.customerInfo.phone} • </span>
                         )}
                         <span className={order.source === 'online' ? 'text-green-700 font-semibold' : 'text-blue-700 font-semibold'}>
                           {order.source === 'online' ? 'Online Order' : 'POS Order'}
                         </span>
                         {order.paymentStatus && (
                           <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                             order.paymentStatus === 'paid' 
                               ? 'bg-green-100 text-green-800' 
                               : order.paymentStatus === 'unpaid'
                               ? 'bg-red-100 text-red-800'
                               : 'bg-yellow-100 text-yellow-800'
                           }`}>
                             {order.paymentStatus === 'paid' ? 'Paid' : 
                              order.paymentStatus === 'unpaid' ? 'Unpaid' : 
                              'Pending'}
                           </span>
                         )}
                       </div>
                     </div>
                     <div className="flex gap-2">
                       {/* Reprint Receipt Button */}
                       <button
                         className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold flex items-center gap-1"
                         onClick={async () => {
                          // Prepare order data for reprint (match printReceiptIfLocal structure)
                          const orderForPrint = {
                            id: order.id,
                            storeId: currentStore?.id ?? '',
                            storeName: currentStore?.name ?? '',
                            orderNumber: order.orderNumber,
                            customerInfo: order.customerInfo || { name: '', phone: '' },
                            items: order.items,
                            total: order.total,
                            createdAt: order.timestamp,
                            storeAddress: currentStore?.address ?? '',
                            storePhone: currentStore?.phone ?? '',
                            orderType: order.orderType,
                            // Include scheduled order information from the original order - using correct Firebase structure
                            pickupDetails: order.pickupDetails,
                            deliveryDetails: order.deliveryDetails,
                            // Include other receipt fields
                            subtotal: order.subtotal,
                            tax: order.tax,
                            paymentMethod: order.paymentMethod,
                            deliveryAddress: order.deliveryAddress,
                          };
                          if (window.electronAPI && typeof window.electronAPI.printReceipt === 'function') {
                            await window.electronAPI.printReceipt(orderForPrint, 'reprint');
                          } else {
                            alert('Reprint not available in browser mode.');
                          }
                        }}
                      >
                        <Printer className="w-3 h-3" /> Reprint
                      </button>
                      {/* Mark as Paid Button - only show for unpaid orders */}
                      {order.paymentStatus !== 'paid' && (
                        <button
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold flex items-center gap-1"
                          onClick={() => markAsPaid(order.id)}
                        >
                          <CheckCircle className="w-3 h-3" /> Mark Paid
                        </button>
                      )}
                      {/* Existing actions (expand, modify, etc.) */}
                      <button onClick={() => toggleOrderExpansion(order.id)}>
                        <ChevronDown className={cn('w-5 h-5 text-gray-400', expandedOrders.has(order.id) && 'rotate-180')} />
                      </button>
                      <button
                        className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded"
                        onClick={() => handleModifyOrder(order)}
                      >
                        Modify
                      </button>
                    </div>
                  </div>

                  {expandedOrders.has(order.id) && (
                    <div className="mt-4 border-t pt-2">
                      <div
                        className="text-sm text-gray-800 font-mono whitespace-pre-line"
                        dangerouslySetInnerHTML={{
                          __html: order.items.map(item => {
                            let html = `<b>${item.quantity}x ${item.name}${item.size ? ' (' + item.size + ')' : ''}</b> $${item.price.toFixed(2)}<br/>`;
                            // Combo: customizations as array or object with numeric keys
                            let comboArr = null;
                            if (Array.isArray(item.customizations)) comboArr = item.customizations;
                            else if (item.customizations && typeof item.customizations === 'object' && Object.keys(item.customizations).every(k => !isNaN(Number(k)))) comboArr = Object.values(item.customizations);
                            if (comboArr && comboArr.length > 0) {
                              comboArr.forEach(step => {
                                // Handle dipping sauces specially
                                if (step.type === 'dipping' && step.selectedDippingSauces && step.sauceData) {
                                  // Show individual dipping sauce items
                                  Object.entries(step.selectedDippingSauces).forEach(([sauceId, quantity]: [string, any]) => {
                                    const sauceName = step.sauceData[sauceId]?.name || 'Dipping Sauce';
                                    html += `&nbsp;&nbsp;- <b>${quantity}x ${sauceName}</b><br/>`;
                                  });
                                } else {
                                  // For steps with itemName (like sides/drinks), use the actual item name
                                  let stepDisplayName;
                                  if (step.itemName && step.itemName.trim() !== '') {
                                    stepDisplayName = step.itemName;
                                  } else {
                                    stepDisplayName = step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : 'Item';
                                  }
                                  html += `&nbsp;&nbsp;- <b>${stepDisplayName}</b>${step.size ? ' (' + step.size + ')' : ''}<br/>`;
                                  if (step.toppings) {
                                    const t = step.toppings;
                                    if (t.wholePizza && t.wholePizza.length > 0) html += `&nbsp;&nbsp;&nbsp;&nbsp;Whole: ${(t.wholePizza as { name: string }[]).map((t: { name: string }) => t.name).join(', ')}<br/>`;
                                    if (t.leftSide && t.leftSide.length > 0) html += `&nbsp;&nbsp;&nbsp;&nbsp;Left: ${(t.leftSide as { name: string }[]).map((t: { name: string }) => t.name).join(', ')}<br/>`;
                                    if (t.rightSide && t.rightSide.length > 0) html += `&nbsp;&nbsp;&nbsp;&nbsp;Right: ${(t.rightSide as { name: string }[]).map((t: { name: string }) => t.name).join(', ')}<br/>`;
                                  }
                                  if (step.sauces && step.sauces.length > 0) html += `&nbsp;&nbsp;&nbsp;&nbsp;Sauces: ${step.sauces.map((s: { name: string }) => s.name).join(', ')}<br/>`;
                                  if (step.instructions && step.instructions.length > 0) html += `&nbsp;&nbsp;&nbsp;&nbsp;Instructions: ${step.instructions.join(', ')}<br/>`;
                                  if (!isNaN(Number(step.extraCharge)) && Number(step.extraCharge) > 0) html += `&nbsp;&nbsp;&nbsp;&nbsp;Extra Charge: $${Number(step.extraCharge).toFixed(2)}<br/>`;
                                }
                              });
                              if (Number(item.extraCharges) > 0) html += `&nbsp;&nbsp;Extra Charge: $${Number(item.extraCharges).toFixed(2)}<br/>`;
                            } else if (item.customizations && typeof item.customizations === 'object') {
                              if (item.customizations.size) html += `&nbsp;&nbsp;Size: ${item.customizations.size}<br/>`;
                              if (item.customizations.toppings) {
                                const t = item.customizations.toppings;
                                if (t.wholePizza && t.wholePizza.length > 0) html += `&nbsp;&nbsp;Whole: ${(t.wholePizza as { name: string }[]).map((t: { name: string }) => t.name).join(', ')}<br/>`;
                                if (t.leftSide && t.leftSide.length > 0) html += `&nbsp;&nbsp;Left: ${(t.leftSide as { name: string }[]).map((t: { name: string }) => t.name).join(', ')}<br/>`;
                                if (t.rightSide && t.rightSide.length > 0) html += `&nbsp;&nbsp;Right: ${(t.rightSide as { name: string }[]).map((t: { name: string }) => t.name).join(', ')}<br/>`;
                              }
                              if (item.customizations.sauces && item.customizations.sauces.length > 0) html += `&nbsp;&nbsp;Sauces: ${item.customizations.sauces.map((s: { name: string }) => s.name).join(', ')}<br/>`;
                              if (item.customizations.instructions && item.customizations.instructions.length > 0) html += `&nbsp;&nbsp;Instructions: ${item.customizations.instructions.join(', ')}<br/>`;
                              if (item.customizations.extraCharge && Number(item.customizations.extraCharge) > 0) html += `&nbsp;&nbsp;Extra Charge: $${Number(item.customizations.extraCharge).toFixed(2)}<br/>`;
                            }
                            if (item.extraCharges && Number(item.extraCharges) > 0 && !(comboArr && comboArr.length > 0)) html += `&nbsp;&nbsp;Extra Charge: $${Number(item.extraCharges).toFixed(2)}<br/>`;
                            html += '<br/>';
                            return html;
                          }).join('')
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
