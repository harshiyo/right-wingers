import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useStore } from '../context/StoreContext';
import { X } from 'lucide-react';

interface OnlineOrder {
  id: string;
  customerInfo?: {
    name: string;
  };
  timestamp: number;
  total: number;
}

export function OnlineOrderNotification() {
  const [notifications, setNotifications] = useState<OnlineOrder[]>([]);
  const { currentStore } = useStore();

  useEffect(() => {
    if (!currentStore?.id) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('storeId', '==', currentStore.id),
      where('source', '==', 'online'),
      where('status', '==', 'pending'),
      where('timestamp', '>=', startOfDay.getTime()),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Only show notifications for new orders
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const order = { id: change.doc.id, ...change.doc.data() } as OnlineOrder;
          setNotifications(prev => [order, ...prev]);
          
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(console.error);
        }
      });
    });

    return () => unsubscribe();
  }, [currentStore?.id]);

  // Remove notification after 10 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      {notifications.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-lg shadow-lg p-4 max-w-sm animate-slide-in-left"
          style={{
            animation: 'slideInLeft 0.5s ease-out'
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900">New Online Order!</h3>
              <p className="text-sm text-gray-600">
                {order.customerInfo?.name || 'Customer'} - ${order.total.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => removeNotification(order.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <style>
        {`
          @keyframes slideInLeft {
            from {
              transform: translateX(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
} 