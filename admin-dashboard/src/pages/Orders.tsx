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
  Store as StoreIcon,
  Globe,
  Monitor
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
    customizations?: any; // Complex object from POS client
    size?: string;
    extraCharges?: number;
    imageUrl?: string;
    sauces?: Array<{ name: string; description?: string }>; // New format for sauces
    instructions?: Array<{ label: string }>; // New format for instructions
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
  timestamp?: number; // POS client uses timestamp
  deliveryDetails?: any;
  pickupDetails?: any;
  orderSource?: 'online' | 'pos'; // Add this field
  store?: { id: string; name: string }; // Added for store name in detail view
  source?: 'online' | 'pos'; // Added for source in detail view
  discountTotal?: number; // Added for discount total in summary
}

interface StoreSync {
  storeId: string;
  storeName: string;
  lastSyncTime?: string;
  pendingOrders: number;
  failedSyncs: number;
  isOnline: boolean;
}

const Orders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [storeSyncStatus, setStoreSyncStatus] = useState<StoreSync[]>([]);
  const [showSyncStatus, setShowSyncStatus] = useState(false);

  // Store list for filtering
  const stores = [
    { id: 'store_001', name: 'Hamilton' },
    { id: 'store_002', name: 'Burlington' },
    { id: 'store_003', name: 'St. Catharines' },
    { id: 'store_004', name: 'Oakville' }
  ];

  // Initialize store filter based on user role
  useEffect(() => {
    if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
      setStoreFilter(currentUser.assignedStoreId);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrders();
    fetchStoreSyncStatus();
    const interval = setInterval(fetchStoreSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter, typeFilter, dateFilter, storeFilter, currentUser]);

  const getOrderSource = (order: Order): 'online' | 'pos' => {
    // Check for explicit source fields first
    if (order.orderSource === 'online' || order.source === 'online') return 'online';
    if (order.orderSource === 'pos' || order.source === 'pos') return 'pos';
    
    // Check order number format
    if (order.orderNumber?.startsWith('RWO')) return 'online';
    if (order.orderNumber?.startsWith('RWP')) return 'pos';
    
    // Default to POS if no other indicators
    return 'pos';
  };

  const formatOrderNumber = (order: Order): string => {
    // If we already have a properly formatted order number, use it
    if (order.orderNumber?.match(/^RW[OP]\d{6}$/)) {
      return order.orderNumber;
    }

    // Get the source
    const source = getOrderSource(order);
    const prefix = source === 'online' ? 'RWO' : 'RWP';
    
    // For online orders, try to get the last 6 characters of the ID
    if (source === 'online') {
      const match = order.id?.match(/[A-Za-z0-9]{6}$/);
      if (match) {
        const counter = parseInt(match[0], 36); // Convert base36 to number
        if (!isNaN(counter)) {
          return `${prefix}${String(counter).padStart(6, '0')}`;
        }
      }
    }
    
    // For POS orders or fallback
    const timestamp = order.timestamp || Date.now();
    const counter = Math.floor(Math.random() * 1000000); // Random 6-digit number
    return `${prefix}${String(counter).padStart(6, '0')}`;
  };

  const fetchOrders = async () => {
    try {
      // Get orders sorted by createdAt
      const createdAtQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const createdAtSnapshot = await getDocs(createdAtQuery);
      const createdAtOrders = createdAtSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      // Get orders sorted by timestamp
      const timestampQuery = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
      const timestampSnapshot = await getDocs(timestampQuery);
      const timestampOrders = timestampSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      // Combine and deduplicate orders
      const allOrders = [...createdAtOrders, ...timestampOrders].reduce((acc, curr) => {
        const existingOrder = acc.find(order => order.id === curr.id);
        if (!existingOrder) {
          // Convert timestamp to createdAt format if needed
          if (curr.timestamp && !curr.createdAt) {
            curr.createdAt = new Date(curr.timestamp).toISOString();
          }
          acc.push(curr);
        }
        return acc;
      }, [] as Order[]);

      // Sort combined orders by date (using either createdAt or timestamp)
      const sortedOrders = allOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.timestamp || 0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.timestamp || 0);
        return dateB.getTime() - dateA.getTime();
      }).map(order => ({
        ...order,
        orderNumber: formatOrderNumber(order)
      }));

      setOrders(sortedOrders);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const fetchStoreSyncStatus = async () => {
    try {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(ordersQuery);
      const allOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      const syncStatus: StoreSync[] = stores.map(store => {
        const storeOrders = allOrders.filter(order => order.storeId === store.id);
        
        // Only count orders that are currently in the sync process
        const pendingOrders = storeOrders.filter(order => 
          order.syncStatus === 'pending' && order.offline === true
        ).length;

        const failedSyncs = storeOrders.filter(order => 
          order.syncStatus === 'failed'
        ).length;

        // Get the most recent order time for this store
        const lastOrderTime = storeOrders.length > 0 
          ? storeOrders[0].createdAt 
          : undefined;

        // Check for recent activity (last 5 minutes) to determine if store is actively syncing
        const recentActivity = storeOrders.some(order => {
          const orderTime = new Date(order.createdAt);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return orderTime > fiveMinutesAgo;
        });

        return {
          storeId: store.id,
          storeName: store.name,
          lastSyncTime: lastOrderTime,
          pendingOrders,
          failedSyncs,
          isOnline: pendingOrders === 0 && failedSyncs === 0 && recentActivity
        };
      });

      setStoreSyncStatus(syncStatus);
    } catch (error) {
      console.error('Error fetching sync status:', error);
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

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(order => order.orderSource === sourceFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(order => {
        // Handle both legacy format and new customerInfo format
        const orderNumber = order.orderNumber || '';
        const customerName = order.customerInfo?.name || order.customerName || '';
        const customerPhone = order.customerInfo?.phone || order.customerPhone || '';
        
        return orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
               customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               customerPhone.includes(searchQuery);
      });
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(order => order.orderType === typeFilter);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(order => {
          const orderDate = order.createdAt ? new Date(order.createdAt) : new Date(order.timestamp || 0);
          return orderDate >= today;
        });
        break;
      case 'yesterday':
        filtered = filtered.filter(order => {
          const orderDate = order.createdAt ? new Date(order.createdAt) : new Date(order.timestamp || 0);
          return orderDate >= yesterday && orderDate < today;
        });
        break;
      case 'week':
        filtered = filtered.filter(order => {
          const orderDate = order.createdAt ? new Date(order.createdAt) : new Date(order.timestamp || 0);
          return orderDate >= weekAgo;
        });
        break;
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status.');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        fetchOrders();
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order.');
      }
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Order['orderType']) => {
    switch (type) {
      case 'dine-in':
        return <Package className="h-4 w-4" />;
      case 'pickup':
        return <Clock className="h-4 w-4" />;
      case 'delivery':
        return <Truck className="h-4 w-4" />;
    }
  };

  const exportOrders = () => {
    const csvContent = [
      ['Order Number', 'Customer', 'Phone', 'Type', 'Status', 'Total', 'Created At', 'Items'].join(','),
      ...filteredOrders.map(order => [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.orderType,
        order.status,
        order.total,
        new Date(order.createdAt).toLocaleString(),
        order.items.map(item => `${item.name} (${item.quantity})`).join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: filteredOrders.length,
    pending: filteredOrders.filter(o => o.status === 'pending').length,
    preparing: filteredOrders.filter(o => o.status === 'preparing').length,
    ready: filteredOrders.filter(o => o.status === 'ready').length,
    totalRevenue: filteredOrders.reduce((sum, o) => sum + o.total, 0)
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading orders...</div></div>;
  }

  const formatCustomizations = (customizations: any) => {
    if (!customizations) return null;
    
    const details: string[] = [];
    
    // Handle simple array of strings (legacy format)
    if (Array.isArray(customizations) && customizations.every(c => typeof c === 'string')) {
      return customizations.join(', ');
    }
    
    // Handle array format (new structure from Firebase)
    if (Array.isArray(customizations)) {
      customizations.forEach((customization) => {
        // Handle sauces
        if (customization.sauces && Array.isArray(customization.sauces)) {
          const sauceNames = customization.sauces
            .map((sauce: any) => sauce.name)
            .filter(Boolean);
          if (sauceNames.length > 0) {
            details.push(`Sauces: ${sauceNames.join(', ')}`);
          }
        }
        
        // Handle instructions if present
        if (customization.instructions && Array.isArray(customization.instructions)) {
          const instructionLabels = customization.instructions
            .map((instruction: any) => instruction.label || instruction)
            .filter(Boolean);
          if (instructionLabels.length > 0) {
            details.push(`Instructions: ${instructionLabels.join(', ')}`);
          }
        }
      });
      
      if (details.length > 0) {
        return details.join('\n');
      }
    }
    
    // Handle complex object structure from POS client (non-combo items)
    if (typeof customizations === 'object') {
      // Size
      if (customizations.size) {
        details.push(`Size: ${customizations.size}`);
      }
      
      // Pizza toppings
      if (customizations.toppings) {
        const toppings: string[] = [];
        
        if (customizations.toppings.wholePizza && customizations.toppings.wholePizza.length > 0) {
          const toppingNames = customizations.toppings.wholePizza.map((t: any) => t.name || t);
          toppings.push(`Whole Pizza: ${toppingNames.join(', ')}`);
        }
        
        if (customizations.toppings.leftSide && customizations.toppings.leftSide.length > 0) {
          const toppingNames = customizations.toppings.leftSide.map((t: any) => t.name || t);
          toppings.push(`Left Side: ${toppingNames.join(', ')}`);
        }
        
        if (customizations.toppings.rightSide && customizations.toppings.rightSide.length > 0) {
          const toppingNames = customizations.toppings.rightSide.map((t: any) => t.name || t);
          toppings.push(`Right Side: ${toppingNames.join(', ')}`);
        }
        
        if (toppings.length > 0) {
          details.push(...toppings);
        }
      }
      
      // Half and half indicator
      if (customizations.isHalfAndHalf) {
        details.push('Half & Half Pizza');
      }
      
      // Wing sauces
      if (customizations.sauces && Array.isArray(customizations.sauces)) {
        const sauceNames = customizations.sauces
          .map((s: any) => s.name)
          .filter(Boolean);
        if (sauceNames.length > 0) {
          details.push(`Sauces: ${sauceNames.join(', ')}`);
        }
      }
      
      // Instructions
      if (customizations.instructions && customizations.instructions.length > 0) {
        const instructionLabels = customizations.instructions
          .map((i: any) => i.label || i)
          .filter(Boolean);
        if (instructionLabels.length > 0) {
          details.push(`Instructions: ${instructionLabels.join(', ')}`);
        }
      }
      
      return details.join('\n');
    }
    
    return details.length > 0 ? details.join('\n') : null;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Track and manage all restaurant orders</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowSyncStatus(!showSyncStatus)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Status
          </Button>
          <Button
            onClick={exportOrders}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {showSyncStatus && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Store Sync Status</h2>
              <p className="text-sm text-gray-600 mt-1">
                Shows only orders that have reached the central database. Offline orders are not visible until sync begins.
              </p>
            </div>
            <Button
              onClick={fetchStoreSyncStatus}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {storeSyncStatus.map((store) => (
              <div
                key={store.storeId}
                className={`p-4 rounded-lg border-2 ${
                  store.isOnline 
                    ? 'border-green-200 bg-green-50' 
                    : store.pendingOrders > 0 || store.failedSyncs > 0
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{store.storeName}</h3>
                  <div className={`w-3 h-3 rounded-full ${
                    store.isOnline 
                      ? 'bg-green-500' 
                      : store.pendingOrders > 0 || store.failedSyncs > 0
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                  }`}></div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={
                      store.isOnline 
                        ? 'text-green-600' 
                        : store.pendingOrders > 0
                          ? 'text-yellow-600'
                          : store.failedSyncs > 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                    }>
                      {store.isOnline 
                        ? 'Online' 
                        : store.pendingOrders > 0
                          ? 'Syncing'
                          : store.failedSyncs > 0
                            ? 'Sync Issues'
                            : 'Unknown'
                      }
                    </span>
                  </div>
                  
                  {store.lastSyncTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Order:</span>
                      <span className="text-gray-900">
                        {new Date(store.lastSyncTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  
                  {store.pendingOrders > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Syncing:</span>
                      <span className="text-yellow-600 font-medium">
                        {store.pendingOrders} orders
                      </span>
                    </div>
                  )}
                  
                  {store.failedSyncs > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Failed:</span>
                      <span className="text-red-600 font-medium">
                        {store.failedSyncs} orders
                      </span>
                    </div>
                  )}

                  {store.pendingOrders === 0 && store.failedSyncs === 0 && !store.isOnline && (
                    <div className="text-xs text-gray-500 mt-2">
                      Offline orders not visible until sync starts
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <RefreshCw className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Preparing</p>
              <p className="text-2xl font-bold text-gray-900">{stats.preparing}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ready</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ready}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="dine-in">Dine In</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="all">All Time</option>
          </select>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Source
            </label>
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Sources</option>
              <option value="online">Online Orders</option>
              <option value="pos">POS Orders</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'today' 
                      ? 'No orders found matching your criteria.' 
                      : 'No orders yet today.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  // Get customer data from either format
                  const customerName = order.customerInfo?.name || order.customerName || 'Unknown';
                  const customerPhone = order.customerInfo?.phone || order.customerPhone || 'N/A';
                  const orderNumber = order.orderNumber || order.id?.slice(-6) || 'N/A';
                  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date(order.timestamp || 0);
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">#{formatOrderNumber(order)}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                            getOrderSource(order) === 'online'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {getOrderSource(order) === 'online' ? (
                              <>
                                <Globe className="h-3 w-3" />
                                Online Order
                              </>
                            ) : (
                              <>
                                <Monitor className="h-3 w-3" />
                                POS Order
                              </>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customerName}</div>
                          <div className="text-sm text-gray-500">{customerPhone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(order.orderType)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">{order.orderType.replace('-', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-0 ${getStatusColor(order.status)} cursor-pointer`}
                        >
                          <option value="pending">Pending</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {orderDate.toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetail(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  #{formatOrderNumber(selectedOrder)}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <div className="flex items-center">
                    <StoreIcon className="h-4 w-4 mr-1" />
                    {selectedOrder.store?.name || stores.find(s => s.id === selectedOrder.storeId)?.name || 'Unknown Store'}
                  </div>
                  <span>•</span>
                  <div className="flex items-center">
                    {getOrderSource(selectedOrder) === 'online' ? <Globe className="h-4 w-4 mr-1" /> : <Monitor className="h-4 w-4 mr-1" />}
                    {getOrderSource(selectedOrder) === 'online' ? 'Online Order' : 'POS Order'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowOrderDetail(false)}
                className="p-2 rounded-full hover:bg-gray-200/50 transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
                <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{selectedOrder.customerInfo?.name || selectedOrder.customerName || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{selectedOrder.customerInfo?.phone || selectedOrder.customerPhone || 'N/A'}</span>
                  </div>
                  {(selectedOrder.deliveryDetails || selectedOrder.customerInfo?.address || selectedOrder.deliveryAddress) && (
                    <div className="flex items-center col-span-2">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <span>
                        {selectedOrder.deliveryDetails
                          ? `${selectedOrder.deliveryDetails.street || selectedOrder.deliveryDetails.address || ''}, ${selectedOrder.deliveryDetails.city || ''} ${selectedOrder.deliveryDetails.postalCode || ''}`.replace(/^, | ,| $/g, '').trim()
                          : selectedOrder.customerInfo?.address || selectedOrder.deliveryAddress || ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => {
                    // Handle both customizations and root-level sauces
                    let customizationDetails: string[] = [];
                    
                    // Handle root-level sauces (new format)
                    if (item.sauces && Array.isArray(item.sauces)) {
                      const sauceNames = item.sauces
                        .map((sauce: any) => sauce.name)
                        .filter(Boolean);
                      if (sauceNames.length > 0) {
                        customizationDetails.push(`Sauces: ${sauceNames.join(', ')}`);
                      }
                    }
                    
                    // Handle legacy customizations if present
                    const legacyCustomizations = formatCustomizations(item.customizations);
                    if (legacyCustomizations) {
                      customizationDetails.push(legacyCustomizations);
                    }
                    
                    // Handle root-level instructions (new format)
                    if (item.instructions && Array.isArray(item.instructions) && item.instructions.length > 0) {
                      const instructionLabels = item.instructions
                        .map((instruction: any) => instruction.label || instruction)
                        .filter(Boolean);
                      if (instructionLabels.length > 0) {
                        customizationDetails.push(`Instructions: ${instructionLabels.join(', ')}`);
                      }
                    }

                    return (
                      <div key={index} className="flex justify-between items-start bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            {item.imageUrl && (
                              <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-full object-cover" />
                            )}
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.size && <div className="text-sm text-gray-600">Size: {item.size}</div>}
                              {customizationDetails.length > 0 && (
                                <div className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                                  {customizationDetails.join('\n')}
                                </div>
                              )}
                              {item.extraCharges && item.extraCharges > 0 && (
                                <div className="text-sm text-orange-600 font-medium mt-1">
                                  Extra charges: +${typeof item.extraCharges === 'number' ? item.extraCharges.toFixed(2) : '0.00'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-600">Qty: {item.quantity}</div>
                          <div className="font-medium">
                            ${typeof ((item.price + (item.extraCharges || 0)) * item.quantity) === 'number' ? ((item.price + (item.extraCharges || 0)) * item.quantity).toFixed(2) : '0.00'}
                            {typeof item.extraCharges === 'number' && item.extraCharges > 0 && (
                              <div className="text-sm text-gray-500">
                                (${typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'} + ${typeof item.extraCharges === 'number' ? item.extraCharges.toFixed(2) : '0.00'})
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${typeof selectedOrder.subtotal === 'number' ? selectedOrder.subtotal.toFixed(2) : '0.00'}</span>
                  </div>
                  {typeof selectedOrder.deliveryFee === 'number' && selectedOrder.deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee:</span>
                      <span className="font-medium">${typeof selectedOrder.deliveryFee === 'number' ? selectedOrder.deliveryFee.toFixed(2) : '0.00'}</span>
                    </div>
                  )}
                  {typeof selectedOrder.discountTotal === 'number' && selectedOrder.discountTotal > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">-${typeof selectedOrder.discountTotal === 'number' ? selectedOrder.discountTotal.toFixed(2) : '0.00'}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">${typeof selectedOrder.tax === 'number' ? selectedOrder.tax.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200/50">
                    <span>Total:</span>
                    <span>${typeof selectedOrder.total === 'number' ? selectedOrder.total.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
                <h3 className="font-semibold text-gray-900 mb-3">Additional Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Order Type:</span>
                    <span className="ml-2 font-medium capitalize">{selectedOrder.orderType.replace('-', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="ml-2 font-medium capitalize">{selectedOrder.paymentMethod || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="ml-2 font-medium capitalize">{selectedOrder.paymentStatus || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Order Status:</span>
                    <span className={`ml-2 font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {(() => {
                        const status = selectedOrder.status || 'pending';
                        return (
                          <span className={`ml-2 font-medium ${getStatusColor(status)}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                  {selectedOrder.orderType === 'pickup' && selectedOrder.pickupDetails && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Pickup Time:</span>
                      <span className="ml-2 font-medium">
                        {selectedOrder.pickupDetails.time === 'asap' ? 'As Soon As Possible' : 
                         new Date(selectedOrder.pickupDetails.scheduledTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Notes:</span>
                      <div className="mt-1 text-gray-700">{selectedOrder.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders; 