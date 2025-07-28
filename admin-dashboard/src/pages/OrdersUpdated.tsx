import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth, stores } from '../services/auth';
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  RefreshCw,
  MapPin,
  Phone,
  User,
  Store as StoreIcon
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';

interface Order {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  // Handle both POS client format (customerInfo object) and legacy format
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  orderType: 'dine-in' | 'pickup' | 'delivery';
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: Array<{
    id?: string;
    baseId?: string;
    name: string;
    quantity: number;
    price: number;
    customizations?: any;
    size?: string;
    extraCharges?: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  deliveryAddress?: string;
  deliveryFee?: number;
  tip?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  estimatedReadyTime?: string;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  storeId?: string;
  offline?: boolean;
  syncStatus?: 'pending' | 'synced' | 'failed';
  firebaseId?: string;
  timestamp?: number;
  deliveryDetails?: any;
  pickupDetails?: any;
}

const OrdersUpdated = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Initialize store filter based on user role
  useEffect(() => {
    if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
      setStoreFilter(currentUser.assignedStoreId);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter, typeFilter, dateFilter, storeFilter]);

  const fetchOrders = async () => {
    try {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(ordersQuery);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Apply role-based filtering first
    if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
      // Store admin only sees their own store
      filtered = filtered.filter(order => order.storeId === currentUser.assignedStoreId);
    } else if (currentUser?.role === 'master_admin' && storeFilter !== 'all') {
      // Master admin with specific store selected
      filtered = filtered.filter(order => order.storeId === storeFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(order => {
        const orderNumber = order.orderNumber || '';
        const customerName = order.customerInfo?.name || order.customerName || '';
        const customerPhone = order.customerInfo?.phone || order.customerPhone || '';
        
        return orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
               customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               customerPhone.includes(searchQuery);
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(order => order.orderType === typeFilter);
    }

    if (dateFilter !== 'all') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      filtered = filtered.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        
        switch (dateFilter) {
          case 'today':
            return orderDate === todayStr;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return orderDate === yesterday.toISOString().split('T')[0];
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(order.createdAt) >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return new Date(order.createdAt) >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
          : order
      ));
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Order['orderType']) => {
    switch (type) {
      case 'dine-in': return <Package className="h-4 w-4" />;
      case 'pickup': return <Clock className="h-4 w-4" />;
      case 'delivery': return <Truck className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const formatCustomizations = (customizations: any) => {
    if (!customizations) return '';
    
    if (typeof customizations === 'string') {
      return customizations;
    }
    
    if (Array.isArray(customizations)) {
      return customizations.join(', ');
    }
    
    if (typeof customizations === 'object') {
      const parts: string[] = [];
      
      // Handle pizza customizations
      if (customizations.size) {
        parts.push(`Size: ${customizations.size}`);
      }
      
      if (customizations.toppings && Array.isArray(customizations.toppings)) {
        const toppings = customizations.toppings
          .filter((t: any) => t && (t.name || t.topping))
          .map((t: any) => t.name || t.topping)
          .join(', ');
        if (toppings) parts.push(`Toppings: ${toppings}`);
      }
      
      if (customizations.leftToppings && Array.isArray(customizations.leftToppings)) {
        const leftToppings = customizations.leftToppings
          .filter((t: any) => t && (t.name || t.topping))
          .map((t: any) => t.name || t.topping)
          .join(', ');
        if (leftToppings) parts.push(`Left Side: ${leftToppings}`);
      }
      
      if (customizations.rightToppings && Array.isArray(customizations.rightToppings)) {
        const rightToppings = customizations.rightToppings
          .filter((t: any) => t && (t.name || t.topping))
          .map((t: any) => t.name || t.topping)
          .join(', ');
        if (rightToppings) parts.push(`Right Side: ${rightToppings}`);
      }
      
      // Handle wing customizations
      if (customizations.sauces && Array.isArray(customizations.sauces)) {
        const sauces = customizations.sauces
          .filter((s: any) => s && (s.name || s.sauce))
          .map((s: any) => s.name || s.sauce)
          .join(', ');
        if (sauces) parts.push(`Sauces: ${sauces}`);
      }
      
      // Handle combo customizations
      if (customizations.steps && Array.isArray(customizations.steps)) {
        customizations.steps.forEach((step: any, index: number) => {
          if (step && step.selectedItem) {
            const stepName = step.selectedItem.itemName || step.selectedItem.name || `Step ${index + 1}`;
            let stepDetails = stepName;
            
            if (step.selectedItem.size) {
              stepDetails += ` (${step.selectedItem.size})`;
            }
            
            // Add toppings for pizza steps
            if (step.selectedItem.selectedToppings && step.selectedItem.selectedToppings.length > 0) {
              const toppings = step.selectedItem.selectedToppings
                .map((t: any) => t.name || t.topping)
                .join(', ');
              stepDetails += `\nToppings: ${toppings}`;
            }
            
            // Add sauces for wing steps
            if (step.selectedItem.selectedSauces && step.selectedItem.selectedSauces.length > 0) {
              const sauces = step.selectedItem.selectedSauces
                .map((s: any) => s.name || s.sauce)
                .join(', ');
              stepDetails += `\nSauces: ${sauces}`;
            }
            
            parts.push(stepDetails);
          }
        });
      }
      
      return parts.join('\n\n');
    }
    
    return String(customizations);
  };

  const getCurrentStoreName = () => {
    if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
      const store = stores.find(s => s.id === currentUser.assignedStoreId);
      return store?.name || 'Your Store';
    }
    if (storeFilter === 'all') return 'All Stores';
    const store = stores.find(s => s.id === storeFilter);
    return store?.name || 'Selected Store';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">
            {currentUser?.role === 'store_admin' 
              ? `Managing orders for ${getCurrentStoreName()}`
              : `Viewing orders for ${getCurrentStoreName()}`
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={fetchOrders} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => {}}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number, customer..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Store Filter - Only for Master Admin */}
          {currentUser?.role === 'master_admin' && (
            <div>
              <Select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                <option value="all">All Stores</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          {/* Type Filter */}
          <div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="dine-in">Dine In</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </Select>
          </div>

          {/* Date Filter */}
          <div>
            <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                {currentUser?.role === 'master_admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.orderNumber || `#${order.id.slice(-8)}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.customerInfo?.name || order.customerName || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.customerInfo?.phone || order.customerPhone || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {getTypeIcon(order.orderType)}
                      <span className="ml-2 capitalize">{order.orderType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  {currentUser?.role === 'master_admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stores.find(s => s.id === order.storeId)?.name || 'Unknown'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetail(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                        >
                          Start
                        </Button>
                      )}
                      
                      {order.status === 'preparing' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                        >
                          Ready
                        </Button>
                      )}
                      
                      {order.status === 'ready' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all' || storeFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Orders will appear here once customers start placing them.'}
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Order {selectedOrder.orderNumber || `#${selectedOrder.id.slice(-8)}`}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOrderDetail(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{selectedOrder.customerInfo?.name || selectedOrder.customerName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{selectedOrder.customerInfo?.phone || selectedOrder.customerPhone || 'N/A'}</span>
                  </div>
                  {selectedOrder.deliveryAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{selectedOrder.deliveryAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">Quantity: {item.quantity}</div>
                          {item.size && (
                            <div className="text-sm text-gray-500">Size: {item.size}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${(item.price * item.quantity).toFixed(2)}</div>
                          <div className="text-sm text-gray-500">${item.price.toFixed(2)} each</div>
                        </div>
                      </div>
                      {item.customizations && (
                        <div className="text-sm text-gray-600 whitespace-pre-line">
                          {formatCustomizations(item.customizations)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  {selectedOrder.deliveryFee && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>${selectedOrder.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.tip && (
                    <div className="flex justify-between">
                      <span>Tip:</span>
                      <span>${selectedOrder.tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersUpdated; 