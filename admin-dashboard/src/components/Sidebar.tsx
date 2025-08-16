import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,

  ChefHat,
  Layers,
  Users,
  ShoppingCart,

  Settings,
  Pizza,
  Droplets,
  Package,
  Layout,
  Palette,
  Store,
  UserCheck,
  Monitor,
  Activity,
  Tag,
  Shield,
  Megaphone,
  Package2,
  Sparkles,
  Zap,
  Truck,
} from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

type ColorType = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow' | 'indigo' | 'pink' | 'teal' | 'violet' | 'gray';

interface NavLinkItem {
  id: string;
  to: string;
  text: string;
  icon: React.ComponentType<any>;
  order: number;
  badge?: string;
  color?: ColorType;
}

export const navLinks: NavLinkItem[] = [
  { id: 'dashboard', to: '/', text: 'Dashboard', icon: LayoutDashboard, order: 0, color: 'blue' },

  { id: 'stores', to: '/stores', text: 'Store Management', icon: Store, order: 1, color: 'green' },
  { id: 'users', to: '/users', text: 'User Management', icon: UserCheck, order: 2, color: 'purple' },
  { id: 'role-management', to: '/role-management', text: 'Role Management', icon: Shield, order: 2.5, color: 'purple' },
  { id: 'menu', to: '/menu', text: 'Menu', icon: ChefHat, order: 3, color: 'green' },
  { id: 'categories', to: '/categories', text: 'Categories', icon: Layers, order: 4, color: 'purple' },
  { id: 'toppings', to: '/toppings', text: 'Toppings', icon: Pizza, order: 5, color: 'orange' },
  { id: 'sauces', to: '/sauces', text: 'Sauces', icon: Droplets, order: 6, color: 'red' },
  { id: 'combos', to: '/combos', text: 'Combos', icon: Package, order: 7, color: 'yellow' },
  { id: 'customers', to: '/customers', text: 'Customers', icon: Users, order: 8, color: 'indigo' },
  { id: 'orders', to: '/orders', text: 'Orders', icon: ShoppingCart, order: 9, color: 'green' },
  { id: 'kitchen', to: '/kitchen', text: 'Kitchen Display', icon: ChefHat, order: 9.5, color: 'red' },

  { id: 'marketing', to: '/marketing', text: 'Marketing', icon: Megaphone, order: 10.5, color: 'teal' },
  { id: 'inventory', to: '/inventory', text: 'Inventory', icon: Package2, order: 11, color: 'indigo' },
  { id: 'layout', to: '/layout', text: 'Layout Manager', icon: Layout, order: 12, color: 'teal' },
  { id: 'appearance', to: '/appearance', text: 'Appearance', icon: Palette, order: 13, color: 'violet' },
  { id: 'delivery-charges', to: '/delivery-charges', text: 'Delivery Charges', icon: Truck, order: 13.5, color: 'blue' },
  { id: 'settings', to: '/settings', text: 'Settings', icon: Settings, order: 14, color: 'gray' },
  { id: 'live-logs', to: '/live-logs', text: 'Live Logs', icon: Monitor, order: 15, color: 'red' },
  { id: 'job-status', to: '/job-status', text: 'Job Status', icon: Activity, order: 16, color: 'indigo' },
  { id: 'discount-codes', to: '/discount-codes', text: 'Discount Codes', icon: Tag, order: 17, color: 'orange' },
];

const colorClasses: Record<ColorType, string> = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
  yellow: 'from-yellow-500 to-yellow-600',
  indigo: 'from-indigo-500 to-indigo-600',
  pink: 'from-pink-500 to-pink-600',
  teal: 'from-teal-500 to-teal-600',
  violet: 'from-violet-500 to-violet-600',
  gray: 'from-gray-500 to-gray-600'
};

interface CountData {
  menu: number;
  categories: number;
  toppings: number;
  sauces: number;
  combos: number;
  orders: number;
}

export const Sidebar = () => {
  const { user: currentUser } = useAuth();
  const [counts, setCounts] = useState<CountData>({
    menu: 0,
    categories: 0,
    toppings: 0,
    sauces: 0,
    combos: 0,
    orders: 0
  });

  useEffect(() => {
    // Fetch static counts
    const fetchCounts = async () => {
      try {
        console.log('Fetching counts...');
        const menuCount = await getDocs(collection(db, 'menuItems'));
        const categoriesCount = await getDocs(collection(db, 'categories'));
        const toppingsCount = await getDocs(collection(db, 'toppings'));
        const saucesCount = await getDocs(collection(db, 'sauces'));
        const combosCount = await getDocs(collection(db, 'combos'));

        console.log('Collection sizes:', {
          menu: menuCount.size,
          categories: categoriesCount.size,
          toppings: toppingsCount.size,
          sauces: saucesCount.size,
          combos: combosCount.size
        });

        setCounts(prev => ({
          ...prev,
          menu: menuCount.size,
          categories: categoriesCount.size,
          toppings: toppingsCount.size,
          sauces: saucesCount.size,
          combos: combosCount.size
        }));
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    // Listen to orders in real-time
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', 'in', ['pending', 'preparing'])
    );

    console.log('Setting up orders listener...');
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      console.log('Orders update:', snapshot.size, 'pending/preparing orders');
      setCounts(prev => ({
        ...prev,
        orders: snapshot.size
      }));
    }, (error) => {
      console.error('Error in orders listener:', error);
    });

    fetchCounts();

    return () => unsubscribe();
  }, []);

  // Permission-based nav filtering
  const filteredNavLinks = navLinks.filter(link => {
    // Master admin can see everything
    if (currentUser?.role === 'master_admin') return true;
    
    // Check if user has permissions for this link
    const userPermissions = currentUser?.permissions || [];
    
    // Map navigation IDs to permission IDs
    const permissionMap: Record<string, string> = {
      'dashboard': 'dashboard',

      'stores': 'stores',
      'users': 'user_management',
      'role-management': 'user_management', // Only master admin can see this
      'menu': 'menu',
      'categories': 'categories',
      'toppings': 'toppings',
      'sauces': 'sauces',
      'combos': 'combos',
      'customers': 'customers',
      'orders': 'orders',
      'kitchen': 'kitchen',
      'delivery-charges': 'delivery_details', // Uses delivery_details permission

      'marketing': 'marketing',
      'inventory': 'inventory',
      'layout': 'layout_manager',
      'appearance': 'appearance',
      'settings': 'settings',
      'live-logs': 'live_logs',
      'job-status': 'job_status',
      'discount-codes': 'discount_codes'
    };
    
    const requiredPermission = permissionMap[link.id];
    if (!requiredPermission) return false;
    
    return userPermissions.includes(requiredPermission);
  });

  const CountBadge = ({ count }: { count: number }) => (
    <span className="ml-auto inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-full min-w-[20px] shadow-sm">
      {count}
    </span>
  );

  return (
    <aside className="w-64 h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl flex flex-col fixed border-r border-gray-700/50">
      {/* Enhanced Header with Logo */}
      <div className="h-20 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#800000] via-red-700 to-red-600 opacity-95"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center">
            <img src={logo} alt="Right Wingers Logo" className="w-20 h-20 object-contain" />
          </div>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-1">
          {filteredNavLinks.map(({ id, to, text, icon: Icon, badge, color = 'gray' }) => (
            <NavLink
              key={id}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center p-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-lg transform scale-105 border border-white/20'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-105 hover:shadow-md'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Enhanced background gradient for active state */}
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} opacity-20 rounded-xl`}></div>
                  )}
                  
                  {/* Enhanced icon with gradient background */}
                  <div className={`relative z-10 p-2.5 rounded-lg mr-3 transition-all duration-300 ${
                    isActive 
                      ? `bg-gradient-to-br ${colorClasses[color]} shadow-lg` 
                      : 'bg-white/10 group-hover:bg-white/20 group-hover:shadow-md'
                  }`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} />
                  </div>
                  
                  {/* Enhanced text */}
                  <span className="relative z-10 flex-1 font-medium">{text}</span>
                  
                  {/* Enhanced badge */}
                  {badge && (
                    <span className={`relative z-10 px-2.5 py-1 text-xs font-bold rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'bg-red-100 text-red-800 shadow-sm' 
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm'
                    } ml-2`}>
                      {badge}
                    </span>
                  )}

                  {/* Enhanced hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-white to-white/50 rounded-l-full"></div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Enhanced Footer */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-red-600/20 rounded-xl p-4 border border-blue-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">{currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{currentUser?.name || 'Admin User'}</div>
              <div className="text-xs text-gray-300 flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-400" />
                {currentUser?.role === 'master_admin' ? 'Master Admin' : 'Store Admin'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}; 