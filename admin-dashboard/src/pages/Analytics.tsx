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
  Filter,
  Download,
  RefreshCw,
  PieChart,
  LineChart,
  BarChart,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Target,
  Zap,
  Award,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../services/auth';

interface AnalyticsData {
  revenue: {
    total: number;
    today: number;
    week: number;
    month: number;
    trend: number;
  };
  orders: {
    total: number;
    today: number;
    week: number;
    month: number;
    average: number;
    trend: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    trend: number;
  };
  items: {
    popular: Array<{name: string, count: number, revenue: number}>;
    categories: Array<{name: string, count: number, revenue: number}>;
  };
  timeData: {
    hourly: Array<{hour: number, orders: number, revenue: number}>;
    daily: Array<{date: string, orders: number, revenue: number}>;
    weekly: Array<{week: string, orders: number, revenue: number}>;
  };
  storePerformance: Array<{
    storeId: string;
    storeName: string;
    orders: number;
    revenue: number;
    customers: number;
  }>;
}

interface Order {
  id: string;
  total: number;
  items: Array<{name: string, quantity: number, price: number}>;
  createdAt: string;
  customerInfo?: {name: string; phone: string};
  storeId?: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  lastOrderDate?: string;
  totalOrders?: number;
  totalSpent?: number;
}

const Analytics = () => {
  const { currentUser } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    revenue: { total: 0, today: 0, week: 0, month: 0, trend: 0 },
    orders: { total: 0, today: 0, week: 0, month: 0, average: 0, trend: 0 },
    customers: { total: 0, new: 0, returning: 0, trend: 0 },
    items: { popular: [], categories: [] },
    timeData: { hourly: [], daily: [], weekly: [] },
    storePerformance: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch stores (only for master admin)
  const [storesData, loadingStores] = useCollection(
    currentUser?.role === 'master_admin' 
      ? query(collection(db, 'stores'), where('isActive', '==', true), orderBy('name'))
      : null
  );

  const stores = storesData?.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    isActive: doc.data().isActive
  })) || [];

  // Fetch orders for analytics
  const [ordersData, loadingOrders] = useCollection(
    query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(1000))
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

  // Calculate analytics data
  useEffect(() => {
    if (loadingOrders || loadingCustomers) return;

    const calculateAnalytics = async () => {
      setIsLoading(true);
      
      try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

        // Filter orders based on selected store and user permissions
        let filteredOrders = ordersData?.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[] || [];

        if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
          filteredOrders = filteredOrders.filter(order => order.storeId === currentUser.assignedStoreId);
        } else if (selectedStoreId !== 'all') {
          filteredOrders = filteredOrders.filter(order => order.storeId === selectedStoreId);
        }

        // Filter customers based on store
        let filteredCustomers = customersData?.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Customer[] || [];

        if (currentUser?.role === 'store_admin' && currentUser.assignedStoreId) {
          // For store admins, filter customers who have ordered from their store
          const storeOrderCustomerIds = new Set(
            filteredOrders
              .filter(order => order.storeId === currentUser.assignedStoreId)
              .map(order => order.customerInfo?.phone)
              .filter(Boolean)
          );
          filteredCustomers = filteredCustomers.filter(customer => 
            storeOrderCustomerIds.has(customer.phone)
          );
        }

        // Calculate revenue metrics
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const todayRevenue = filteredOrders
          .filter(order => new Date(order.createdAt) >= today)
          .reduce((sum, order) => sum + (order.total || 0), 0);
        const weekRevenue = filteredOrders
          .filter(order => new Date(order.createdAt) >= weekAgo)
          .reduce((sum, order) => sum + (order.total || 0), 0);
        const monthRevenue = filteredOrders
          .filter(order => new Date(order.createdAt) >= monthAgo)
          .reduce((sum, order) => sum + (order.total || 0), 0);

        // Calculate order metrics
        const totalOrders = filteredOrders.length;
        const todayOrders = filteredOrders.filter(order => new Date(order.createdAt) >= today).length;
        const weekOrders = filteredOrders.filter(order => new Date(order.createdAt) >= weekAgo).length;
        const monthOrders = filteredOrders.filter(order => new Date(order.createdAt) >= monthAgo).length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate customer metrics
        const totalCustomers = filteredCustomers.length;
        const newCustomers = filteredCustomers.filter(customer => 
          new Date(customer.createdAt) >= weekAgo
        ).length;
        const returningCustomers = totalCustomers - newCustomers;

        // Calculate popular items
        const itemCounts = new Map<string, {count: number, revenue: number}>();
        filteredOrders.forEach(order => {
          order.items?.forEach(item => {
            const current = itemCounts.get(item.name) || {count: 0, revenue: 0};
            itemCounts.set(item.name, {
              count: current.count + item.quantity,
              revenue: current.revenue + (item.price * item.quantity)
            });
          });
        });

        const popularItems = Array.from(itemCounts.entries())
          .map(([name, data]) => ({name, count: data.count, revenue: data.revenue}))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Calculate time-based data
        const hourlyData = Array.from({length: 24}, (_, hour) => {
          const hourOrders = filteredOrders.filter(order => {
            const orderHour = new Date(order.createdAt).getHours();
            return orderHour === hour;
          });
          return {
            hour,
            orders: hourOrders.length,
            revenue: hourOrders.reduce((sum, order) => sum + (order.total || 0), 0)
          };
        });

        const dailyData = Array.from({length: 7}, (_, i) => {
          const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
          const dayOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.toDateString() === date.toDateString();
          });
          return {
            date: date.toLocaleDateString('en-US', {weekday: 'short'}),
            orders: dayOrders.length,
            revenue: dayOrders.reduce((sum, order) => sum + (order.total || 0), 0)
          };
        });

        // Calculate store performance (for master admin)
        const storePerformance = currentUser?.role === 'master_admin' ? 
          stores.map(store => {
            const storeOrders = filteredOrders.filter(order => order.storeId === store.id);
            return {
              storeId: store.id,
              storeName: store.name,
              orders: storeOrders.length,
              revenue: storeOrders.reduce((sum, order) => sum + (order.total || 0), 0),
              customers: new Set(storeOrders.map(order => order.customerInfo?.phone).filter(Boolean)).size
            };
          }) : [];

        // Calculate trends (simple comparison with previous period)
        const previousWeekRevenue = filteredOrders
          .filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && 
                   orderDate < weekAgo;
          })
          .reduce((sum, order) => sum + (order.total || 0), 0);

        const revenueTrend = previousWeekRevenue > 0 ? 
          ((weekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 : 0;

        setAnalyticsData({
          revenue: {
            total: totalRevenue,
            today: todayRevenue,
            week: weekRevenue,
            month: monthRevenue,
            trend: revenueTrend
          },
          orders: {
            total: totalOrders,
            today: todayOrders,
            week: weekOrders,
            month: monthOrders,
            average: avgOrderValue,
            trend: revenueTrend // Using same trend for simplicity
          },
          customers: {
            total: totalCustomers,
            new: newCustomers,
            returning: returningCustomers,
            trend: revenueTrend
          },
          items: {
            popular: popularItems,
            categories: [] // TODO: Implement category analytics
          },
          timeData: {
            hourly: hourlyData,
            daily: dailyData,
            weekly: [] // TODO: Implement weekly data
          },
          storePerformance
        });

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error calculating analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateAnalytics();
  }, [ordersData, customersData, selectedStoreId, currentUser, loadingOrders, loadingCustomers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <TrendingUpIcon className="h-4 w-4 text-blue-500" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-blue-600';
  };

  const getTrendBgColor = (trend: number) => {
    if (trend > 0) return 'bg-green-50';
    if (trend < 0) return 'bg-red-50';
    return 'bg-blue-50';
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    gradient = 'from-blue-500 to-blue-600',
    iconBg = 'bg-blue-100',
    iconColor = 'text-blue-600',
    isLoading = false
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    trendValue?: string;
    gradient?: string;
    iconBg?: string;
    iconColor?: string;
    isLoading?: boolean;
  }) => {
          return (
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 break-words">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
                ) : (
                  value
                )}
              </p>
              {trend !== undefined && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getTrendBgColor(trend)} flex-wrap`}>
                  {getTrendIcon(trend)}
                  <span className={`text-sm font-semibold ${getTrendColor(trend)}`}>
                    {trendValue || `${Math.abs(trend).toFixed(1)}%`}
                  </span>
                  <span className="text-xs text-gray-500">vs last period</span>
                </div>
              )}
            </div>
            <div className={`p-3 lg:p-4 rounded-xl ${iconBg} flex-shrink-0`}>
              <Icon className={`h-6 w-6 lg:h-8 lg:w-8 ${iconColor}`} />
            </div>
          </div>
        </div>
      );
  };

  const ChartCard = ({ 
    title, 
    children, 
    className = '',
    gradient = 'from-blue-500 to-purple-600'
  }: {
    title: string;
    children: React.ReactNode;
    className?: string;
    gradient?: string;
  }) => (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
      </div>
      <div className="px-2">
        {children}
      </div>
    </div>
  );

  const SimpleBarChart = ({ data, height = 200, color = 'blue' }: { 
    data: Array<{label: string, value: number}>, 
    height?: number,
    color?: string 
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500'
    };

    return (
      <div className="space-y-4 pr-2" style={{ height }}>
        {data.map((item, index) => {
          const maxValue = Math.max(...data.map(d => d.value));
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-2 gap-3">
                <span className="font-medium text-gray-900 truncate flex-1 min-w-0">{item.label}</span>
                <span className="text-sm font-semibold text-gray-600 flex-shrink-0">{item.value}</span>
              </div>
              <div className="relative bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${colorClasses[color as keyof typeof colorClasses]}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Comprehensive business insights and performance metrics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                <Clock className="h-4 w-4" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {currentUser?.role === 'master_admin' && (
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Store Filter</label>
                <Select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full sm:w-64"
                >
                  <option value="all">All Stores</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full sm:w-48"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(analyticsData.revenue.total)}
            icon={DollarSign}
            trend={analyticsData.revenue.trend}
            gradient="from-green-500 to-green-600"
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <MetricCard
            title="Total Orders"
            value={formatNumber(analyticsData.orders.total)}
            icon={ShoppingCart}
            trend={analyticsData.orders.trend}
            gradient="from-blue-500 to-blue-600"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <MetricCard
            title="Average Order Value"
            value={formatCurrency(analyticsData.orders.average)}
            icon={Target}
            gradient="from-purple-500 to-purple-600"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
          <MetricCard
            title="Total Customers"
            value={formatNumber(analyticsData.customers.total)}
            icon={Users}
            trend={analyticsData.customers.trend}
            gradient="from-orange-500 to-orange-600"
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Today's Revenue"
            value={formatCurrency(analyticsData.revenue.today)}
            icon={Zap}
            gradient="from-green-500 to-green-600"
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <MetricCard
            title="This Week's Orders"
            value={formatNumber(analyticsData.orders.week)}
            icon={Calendar}
            gradient="from-blue-500 to-blue-600"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <MetricCard
            title="New Customers"
            value={formatNumber(analyticsData.customers.new)}
            icon={Award}
            gradient="from-orange-500 to-orange-600"
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Popular Items */}
          <ChartCard title="Popular Items" gradient="from-green-500 to-green-600" className="overflow-hidden">
            {analyticsData.items.popular.length > 0 ? (
              <SimpleBarChart 
                data={analyticsData.items.popular.map(item => ({
                  label: item.name,
                  value: item.count
                }))}
                color="green"
              />
            ) : (
              <div className="text-center text-gray-500 py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No order data available</p>
                <p className="text-sm">Start taking orders to see popular items</p>
              </div>
            )}
          </ChartCard>

          {/* Daily Orders */}
          <ChartCard title="Daily Orders (Last 7 Days)" gradient="from-blue-500 to-blue-600" className="overflow-hidden">
            {analyticsData.timeData.daily.length > 0 ? (
              <SimpleBarChart 
                data={analyticsData.timeData.daily.map(day => ({
                  label: day.date,
                  value: day.orders
                }))}
                color="blue"
              />
            ) : (
              <div className="text-center text-gray-500 py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No order data available</p>
                <p className="text-sm">Start taking orders to see daily trends</p>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Store Performance (Master Admin Only) */}
        {currentUser?.role === 'master_admin' && analyticsData.storePerformance.length > 0 && (
          <ChartCard title="Store Performance" gradient="from-purple-500 to-purple-600">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Store</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Orders</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Revenue</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Customers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analyticsData.storePerformance.map((store, index) => (
                    <tr key={store.storeId} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mr-3"></div>
                          <span className="font-medium text-gray-900">{store.storeName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-900">{formatNumber(store.orders)}</td>
                      <td className="py-4 px-6 text-gray-900 font-semibold">{formatCurrency(store.revenue)}</td>
                      <td className="py-4 px-6 text-gray-900">{formatNumber(store.customers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}

        {/* Export Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Export Analytics Data</h3>
              <p className="text-blue-100">Download comprehensive reports for further analysis</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <BarChart className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 