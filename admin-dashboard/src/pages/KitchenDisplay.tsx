import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useSelectedStore } from '../context/SelectedStoreContext';

interface OrderItem {
  name: string;
  quantity: number;
  customizations?: any;
  extraCharges?: number;
  isUpdated?: boolean; // Added isUpdated property
  action?: string; // Added action property
}

interface Order {
  id: string;
  items: OrderItem[];
  customerInfo: {
    name: string;
    address?: string;
    phone: string;
  };
  status: string;
  createdAt: Timestamp;
  orderType: string;
  orderNumber: string;
}

const KitchenDisplay = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const ordersContainerRef = useRef<HTMLDivElement>(null);
  const { selectedStore } = useSelectedStore();

  const toggleFullscreen = async () => {
    if (!ordersContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await ordersContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['pending', 'preparing']),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Raw order data:', data);
        return {
          id: doc.id,
          ...data
        };
      }) as Order[];
      setOrders(newOrders);
    });

    return () => unsubscribe();
  }, []);

  const formatCustomizations = (item: OrderItem) => {
    if (!item.customizations) return null;
    
    const details = [];
    
    // Handle regular item customizations
    if (!Array.isArray(item.customizations)) {
      // Handle toppings
      if (item.customizations.toppings) {
        const toppings = [];
        if (item.customizations.toppings.wholePizza && item.customizations.toppings.wholePizza.length > 0) {
          const toppingNames = item.customizations.toppings.wholePizza
            .map((t: any) => t.name || t)
            .filter((name: any) => name && name !== '' && String(name) !== '0');
          if (toppingNames.length > 0) {
            toppings.push(`Whole: ${toppingNames.join(', ')}`);
          }
        }
        if (item.customizations.toppings.leftSide && item.customizations.toppings.leftSide.length > 0) {
          const toppingNames = item.customizations.toppings.leftSide
            .map((t: any) => t.name || t)
            .filter((name: any) => name && name !== '' && String(name) !== '0');
          if (toppingNames.length > 0) {
            toppings.push(`Left: ${toppingNames.join(', ')}`);
          }
        }
        if (item.customizations.toppings.rightSide && item.customizations.toppings.rightSide.length > 0) {
          const toppingNames = item.customizations.toppings.rightSide
            .map((t: any) => t.name || t)
            .filter((name: any) => name && name !== '' && String(name) !== '0');
          if (toppingNames.length > 0) {
            toppings.push(`Right: ${toppingNames.join(', ')}`);
          }
        }
        
        if (toppings.length > 0) {
          details.push('Toppings:');
          details.push(...toppings.map(t => `  ${t}`));
        }
      }
      
      // Handle sauces
      if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) {
        const sauceNames = item.customizations.sauces
          .map((s: any) => s.name || s)
          .filter((name: any) => name && name !== '' && String(name) !== '0');
        if (sauceNames.length > 0) {
          details.push(`Sauces: ${sauceNames.join(', ')}`);
        }
      }
    } else {
      // Handle combo customizations
      item.customizations.forEach((step: any, index: number) => {
        let stepName = step.itemName || step.name;
        if (!stepName) {
          switch (step.type) {
            case 'pizza': stepName = 'Pizza'; break;
            case 'wings': stepName = 'Wings'; break;
            case 'side': stepName = 'Side'; break;
            case 'drink': stepName = 'Drink'; break;
            default: stepName = `Item ${index + 1}`;
          }
        }
        
        details.push(`${stepName}${step.size ? ` (${step.size})` : ''}`);
        
        // Handle combo item toppings
        if (step.toppings) {
          if (step.toppings.wholePizza && step.toppings.wholePizza.length > 0) {
            const toppingNames = step.toppings.wholePizza
              .map((t: any) => t.name || t)
              .filter((name: any) => name && name !== '' && String(name) !== '0');
            if (toppingNames.length > 0) {
              details.push(`  Whole: ${toppingNames.join(', ')}`);
            }
          }
        }
        
        // Handle combo item sauces
        if (step.sauces && step.sauces.length > 0) {
          const sauceNames = step.sauces
            .map((s: any) => s.name || s)
            .filter((name: any) => name && name !== '' && String(name) !== '0');
          if (sauceNames.length > 0) {
            details.push(`  Sauces: ${sauceNames.join(', ')}`);
          }
        }
      });
    }
    
    return details;
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <button
          onClick={toggleFullscreen}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        </button>
      </div>

      <div 
        ref={ordersContainerRef}
        className={`${isFullscreen ? 'fixed inset-0 bg-gray-100 overflow-auto p-2' : ''}`}
      >
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No pending orders at the moment</p>
          </div>
        ) : (
          <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 ${isFullscreen ? 'p-2' : ''}`}>
            {orders.map((order) => (
              <div 
                key={order.id}
                className={`bg-white rounded-lg shadow-lg border-2 ${
                  order.status === 'preparing' ? 'border-yellow-500' : 'border-red-600'
                } overflow-hidden flex flex-col`}
              >
                <div className={`${
                  order.status === 'preparing' ? 'bg-yellow-500' : 'bg-red-600'
                } text-white px-3 py-2`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-bold text-lg">
                        {order.customerInfo?.name || 'Customer'}
                      </h2>
                      <div className="text-sm opacity-90">
                        #{order.orderNumber}
                      </div>
                      {/* Show 'Order updated' badge if any item is updated */}
                      {order.items.some(item => item.isUpdated) && (
                        <div className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mt-1 ml-1">
                          Order updated
                        </div>
                      )}
                    </div>
                    <span className="bg-white px-2 py-0.5 rounded text-sm font-medium ml-2 whitespace-nowrap h-fit"
                      style={{ color: order.status === 'preparing' ? '#eab308' : '#dc2626' }}
                    >
                      {order.orderType}
                    </span>
                  </div>
                </div>
                
                <div className="p-3 space-y-3 flex-1 overflow-auto">
                  {/* If all items are isUpdated, show only those with a header */}
                  {order.items.every(item => item.isUpdated) ? (
                    <>
                      <div className="text-blue-700 font-bold text-sm mb-2">Updated Items</div>
                      {order.items.filter(item => item.isUpdated).map((item, index) => {
                        const customizations = formatCustomizations(item);
                        return (
                          <div key={index} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-lg text-gray-900 whitespace-nowrap">
                                {item.quantity}x
                              </span>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate flex items-center">
                                  {item.name}
                                  <span className="ml-2 inline-block bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">Updated</span>
                                </h3>
                                {customizations && customizations.length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {customizations.map((detail, idx) => (
                                      <p 
                                        key={idx} 
                                        className={`text-sm text-gray-600 ${detail.startsWith('  ') ? 'ml-3' : 'font-medium'}`}
                                      >
                                        {detail}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    order.items.map((item, index) => {
                      const customizations = formatCustomizations(item);
                      if (item.action === 'removed') {
                        return (
                          <div key={index} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-400 line-through flex items-center">
                                {item.name}
                                <span className="ml-2 inline-block bg-red-200 text-red-800 text-xs font-bold px-2 py-0.5 rounded">Removed</span>
                              </h3>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-lg text-gray-900 whitespace-nowrap">
                              {item.quantity}x
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate flex items-center">
                                {item.name}
                                {item.isUpdated && (
                                  <span className="ml-2 inline-block bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">Updated</span>
                                )}
                              </h3>
                              {customizations && customizations.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {customizations.map((detail, idx) => (
                                    <p 
                                      key={idx} 
                                      className={`text-sm text-gray-600 ${detail.startsWith('  ') ? 'ml-3' : 'font-medium'}`}
                                    >
                                      {detail}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 border-t">
                  {order.status === 'pending' ? (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                    >
                      Start Preparing
                    </button>
                  ) : (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDisplay; 