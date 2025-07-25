import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
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

export const NotificationsContainer = () => {
  const { currentStore } = useStore();
  const [notifications, setNotifications] = useState<OnlineOrder[]>([]);

  useEffect(() => {
    if (!currentStore?.id) return;

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

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const orderData = change.doc.data();
          const order = {
            ...orderData,
            id: change.doc.id
          } as OnlineOrder;
          
          setNotifications(prev => [...prev, order]);
          
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(err => console.log('Error playing sound:', err));
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