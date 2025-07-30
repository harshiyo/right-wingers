import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useStore } from '../context/StoreContext';
import { OrderNotification } from './OrderNotification';
import { AnimatePresence } from 'framer-motion';

interface OnlineOrder {
  id: string;
  customerInfo?: {
    name: string;
  };
  storeId: string;
  createdAt?: Timestamp;
  timestamp?: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  source: 'online' | 'pos';
}

// Function to automatically print receipt for online orders
const printOnlineOrderReceipt = async (orderId: string) => {
  try {
    console.log('🖨️ Auto-printing receipt for online order:', orderId);
    
    // Fetch complete order data from Firebase
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      console.error('❌ Order not found:', orderId);
      return;
    }
    
    const orderData = orderDoc.data();
    
    // Transform order data to match POS receipt format
    const receiptOrder = {
      ...orderData,
      id: orderId,
      orderNumber: orderData.orderNumber,
      customerInfo: orderData.customerInfo,
      storeId: orderData.storeId,
      storeName: orderData.store?.name || 'Store',
      storeAddress: orderData.store?.address || '',
      storePhone: '', // Could add this to store data if needed
      items: orderData.items || [],
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total: orderData.total,
      orderType: orderData.orderType,
      paymentStatus: orderData.paymentStatus || 'pending',
      pickupDetails: orderData.pickupDetails,
      deliveryDetails: orderData.deliveryDetails,
      discounts: orderData.discounts || [],
      discount: orderData.discountTotal || 0,
      createdAt: orderData.createdAt || new Date() // Add missing createdAt field
    };
    
    // Call electron print function
    if ((window as any).electronAPI && (window as any).electronAPI.printReceipt) {
      await (window as any).electronAPI.printReceipt(receiptOrder, 'new');
      console.log('✅ Receipt printed successfully for order:', orderId);
    } else {
      console.warn('⚠️ Electron API not available - running in web mode');
    }
    
  } catch (error) {
    console.error('❌ Failed to print receipt for online order:', error);
    // Don't throw - just log the error so notifications continue working
  }
};

export const NotificationsContainer = () => {
  const { currentStore } = useStore();
  const [notifications, setNotifications] = useState<OnlineOrder[]>([]);
  const [processedOrders, setProcessedOrders] = useState<Set<string>>(new Set()); // Track processed orders to prevent duplicates

  useEffect(() => {
    if (!currentStore?.id) return;

    // Clear processed orders when store changes
    setProcessedOrders(new Set());
    setNotifications([]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Query for new online orders for the current store
    const ordersQuery = query(
      collection(db, 'orders'),
      where('storeId', '==', currentStore.id),
      where('source', '==', 'online'),
      where('status', '==', 'pending'),
      where('timestamp', '>=', startOfDay.getTime())
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      if (isInitialLoad) {
        // On initial load, mark all existing orders as processed but don't notify/print
        console.log('📊 Initial load - marking existing orders as processed:', snapshot.docs.length);
        setProcessedOrders(prev => {
          const newProcessed = new Set(prev);
          snapshot.docs.forEach(doc => {
            newProcessed.add(doc.id);
            console.log('✅ Marked as processed (existing):', doc.id);
          });
          return newProcessed;
        });
        isInitialLoad = false;
        return;
      }

      // After initial load, only process actual new orders
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const orderData = change.doc.data();
          const order = {
            ...orderData,
            id: change.doc.id
          } as OnlineOrder;
          
          // Check if we've already processed this order
          setProcessedOrders(prev => {
            if (prev.has(order.id)) {
              console.log('🔄 Order already processed, skipping:', order.id);
              return prev; // Don't process again
            }
            
            // Mark as processed and handle the new order
            const newProcessed = new Set(prev);
            newProcessed.add(order.id);
            
            // Process the new order
            setNotifications(prevNotifications => [...prevNotifications, order]);
            
            // Play notification sound
            const audio = new Audio('/notification.mp3');
            audio.play().catch(err => console.log('Error playing sound:', err));
            
            // Automatically print receipt in electron environment
            if ((window as any).electronAPI) {
              console.log('🔔 New online order received - auto-printing receipt:', order.id);
              printOnlineOrderReceipt(order.id);
            }
            
            return newProcessed;
          });
        }
      });
    });

    return () => unsubscribe();
  }, [currentStore?.id]);

  const removeNotification = (orderId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== orderId));
  };

  return (
    <div className="fixed left-0 bottom-20 z-50 p-4 space-y-2">
      <AnimatePresence>
        {notifications.map((order) => (
          <OrderNotification
            key={order.id}
            orderId={order.id}
            customerName={order.customerInfo?.name}
            onClose={() => removeNotification(order.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}; 