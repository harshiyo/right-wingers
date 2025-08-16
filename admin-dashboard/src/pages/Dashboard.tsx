import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Pizza,
  Package,
  Calendar,
  Clock,
  Star,
  Eye,
  BarChart3,
  Activity,
  Store as StoreIcon,
  Filter
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth, stores } from '../services/auth';

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  popularItems: Array<{name: string, count: number}>;
  recentActivity: Array<{id: string, type: string, description: string, timestamp: string}>;
}

interface Store {
  id: string;
  name: string;
  isActive: boolean;
}

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    popularItems: [],
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch stores (only for master admin)
  const [storesData, loadingStores, errorStores] = useCollection(
    currentUser?.role === 'master_admin' 
      ? query(collection(db, 'stores'), orderBy('name'))
      : null
  );

  // Use hardcoded stores from auth service as fallback, or combine with Firestore data
  const stores: Store[] = React.useMemo(() => {
    if (currentUser?.role === 'master_admin') {
      // If Firestore stores are loading or empty, use hardcoded stores
      if (loadingStores) {
        return [
          { id: 'store_001', name: 'Hamilton', isActive: true },
          { id: 'store_002', name: 'Burlington', isActive: true },
          { id: 'store_003', name: 'St. Catharines', isActive: true },
          { id: 'store_004', name: 'Oakville', isActive: true }
        ];
      }
      
      if (!storesData?.docs || storesData.docs.length === 0) {
        return [
          { id: 'store_001', name: 'Hamilton', isActive: true },
          { id: 'store_002', name: 'Burlington', isActive: true },
          { id: 'store_003', name: 'St. Catharines', isActive: true },
          { id: 'store_004', name: 'Oakville', isActive: true }
        ];
      }
      
      // Use Firestore stores if available
      return storesData.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown Store',
          isActive: data.isActive !== false // Default to true if not specified
        };
      });
    }
    
    // For store admins, return their assigned store
    if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
      const hardcodedStores = [
        { id: 'store_001', name: 'Hamilton', isActive: true },
        { id: 'store_002', name: 'Burlington', isActive: true },
        { id: 'store_003', name: 'St. Catharines', isActive: true },
        { id: 'store_004', name: 'Oakville', isActive: true }
      ];
      return hardcodedStores.filter(store => store.id === currentUser.assignedStoreId);
    }
    
    return [];
  }, [currentUser, storesData, loadingStores]);

  // Fetch orders for dashboard stats
  const [ordersData, loadingOrders] = useCollection(
    query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100))
  );

  // Fetch customers
  const [customersData, loadingCustomers] = useCollection(
    query(collection(db, 'customers'), orderBy('createdAt', 'desc'))
  );

  // Initialize store filter based on user role
  useEffect(() => {
    if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
      setSelectedStoreId(currentUser.assignedStoreId);
    }
  }, [currentUser]);

  // Calculate dashboard statistics
  useEffect(() => {
    if (loadingOrders || loadingCustomers) return;

    const calculateStats = async () => {
      setIsLoading(true);
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];

        // Filter data based on selected store and user permissions
        let filteredOrders = ordersData?.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[] || [];

        let filteredCustomers = customersData?.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[] || [];

        // Apply store filtering
        if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
          // Store admin only sees their own store
          filteredOrders = filteredOrders.filter(order => order.storeId === currentUser.assignedStoreId);
          filteredCustomers = filteredCustomers.filter(customer => customer.storeId === currentUser.assignedStoreId);
        } else if (currentUser?.role === 'master_admin' && selectedStoreId !== 'all') {
          // Master admin with specific store selected
          filteredOrders = filteredOrders.filter(order => order.storeId === selectedStoreId);
          filteredCustomers = filteredCustomers.filter(customer => customer.storeId === selectedStoreId);
        }

        // Calculate today's orders and revenue
        const todayOrders = filteredOrders.filter(order => {
          const orderDate = order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : 
                           order.timestamp ? new Date(order.timestamp).toISOString().split('T')[0] : '';
          return orderDate === todayString;
        });

        const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

        // Calculate popular items
        const itemCounts: Record<string, number> = {};
        filteredOrders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const itemName = item.name || 'Unknown Item';
              itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1);
            });
          }
        });

        const popularItems = Object.entries(itemCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        // Generate recent activity
        const recentActivity = [
          ...todayOrders.slice(0, 3).map(order => ({
            id: `order-${order.id}`,
            type: 'order',
            description: `New order ${order.orderNumber || order.id} - $${(order.total || 0).toFixed(2)}`,
            timestamp: order.createdAt || new Date(order.timestamp || 0).toISOString()
          })),
          ...filteredCustomers.slice(0, 2).map(customer => ({
            id: `customer-${customer.id}`,
            type: 'customer',
            description: `Customer ${customer.name} registered`,
            timestamp: customer.createdAt || new Date().toISOString()
          }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 4);

        setStats({
          todayRevenue,
          todayOrders: todayOrders.length,
          totalCustomers: filteredCustomers.length,
          avgOrderValue,
          popularItems,
          recentActivity
        });
      } catch (error) {
        console.error('Error calculating dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateStats();
  }, [ordersData, customersData, selectedStoreId, currentUser]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current store name for display
  const getCurrentStoreName = () => {
    if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
      const store = stores.find(s => s.id === currentUser.assignedStoreId);
      return store?.name || 'Your Store';
    }
    if (selectedStoreId === 'all') return 'All Stores';
    const store = stores.find(s => s.id === selectedStoreId);
    return store?.name || 'Selected Store';
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    color = 'blue',
    prefix = '',
    suffix = '',
    isLoading = false
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    prefix?: string;
    suffix?: string;
    isLoading?: boolean;
  }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
      red: 'from-red-500 to-red-600'
    };

    return (
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-sm`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            {trend && trendValue && !isLoading && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <TrendingUp className={`h-3 w-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                {trendValue}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-gray-600 text-sm font-medium">{title}</p>
            {isLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const QuickActionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    color = 'blue',
    onClick 
  }: {
    title: string;
    description: string;
    icon: any;
    color?: 'blue' | 'green' | 'purple' | 'orange';
    onClick?: () => void;
  }) => {
    const colorClasses = {
      blue: 'from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200',
      green: 'from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200',
      purple: 'from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200',
      orange: 'from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200'
    };

    const iconColors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600'
    };

    return (
      <button
        onClick={onClick}
        className={`w-full p-3 rounded-lg border bg-gradient-to-br ${colorClasses[color]} transition-all duration-200 hover:scale-102 hover:shadow-md text-left`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-6 w-6 ${iconColors[color]}`} />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-600">{description}</p>
          </div>
        </div>
      </button>
    );
  };

  if (loadingStores && currentUser?.role === 'master_admin') {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back! Here's what's happening at {getCurrentStoreName()} today.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Store Filter for Master Admin */}
              {currentUser?.role === 'master_admin' && (
                <div className="flex items-center gap-2">
                  <StoreIcon className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-700">Store:</span>
                  <Select 
                    value={selectedStoreId} 
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="min-w-[180px]"
                  >
                    <option value="all">All Stores ({stores.length} available)</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </Select>
                </div>
              )}
              
              {/* Current Time */}
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
                <div className="text-sm text-gray-500">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Revenue"
            value={stats.todayRevenue.toFixed(2)}
            prefix="$"
            icon={DollarSign}
            trend="up"
            trendValue="+12%"
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            title="Orders Today"
            value={stats.todayOrders}
            icon={ShoppingCart}
            trend="up"
            trendValue="+8%"
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            trend="up"
            trendValue="+23"
            color="purple"
            isLoading={isLoading}
          />
          <StatCard
            title="Avg Order Value"
            value={stats.avgOrderValue.toFixed(2)}
            prefix="$"
            icon={BarChart3}
            trend="down"
            trendValue="-3%"
            color="orange"
            isLoading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
            </div>
            
            <div className="space-y-3">
              <QuickActionCard
                title="Add New Item"
                description="Create a new menu item"
                icon={Package}
                color="blue"
                onClick={() => window.location.href = '/menu'}
              />
              <QuickActionCard
                title="View Orders"
                description="Check recent orders"
                icon={ShoppingCart}
                color="green"
                onClick={() => window.location.href = '/orders'}
              />
              <QuickActionCard
                title="Manage Combos"
                description="Create combo deals"
                icon={Pizza}
                color="purple"
                onClick={() => window.location.href = '/combos'}
              />
            </div>
          </div>

          {/* Popular Items */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-gray-900">Popular Items Today</h2>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-200 animate-pulse rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 animate-pulse rounded mb-1"></div>
                      <div className="h-2 bg-gray-200 animate-pulse rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.popularItems.length > 0 ? (
              <div className="space-y-3">
                {stats.popularItems.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 font-bold text-xs">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                      <div className="text-xs text-gray-600">{item.count} orders</div>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Pizza className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No orders today yet</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-200 animate-pulse rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 animate-pulse rounded mb-1"></div>
                      <div className="h-2 bg-gray-200 animate-pulse rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'order' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Activity className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 