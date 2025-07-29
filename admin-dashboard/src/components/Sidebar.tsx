import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  ChefHat,
  Layers,
  Users,
  ShoppingCart,
  MessageSquare,
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
} from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

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
  { id: 'analytics', to: '/analytics', text: 'Analytics', icon: BarChart3, order: 0.5, color: 'purple' },
  { id: 'stores', to: '/stores', text: 'Store Management', icon: Store, order: 1, color: 'green' },
  { id: 'users', to: '/users', text: 'User Management', icon: UserCheck, order: 2, color: 'purple' },
  { id: 'role-management', to: '/role-management', text: 'Role Management', icon: Shield, order: 2.5, color: 'purple' },
  { id: 'menu', to: '/menu', text: 'Menu', icon: ChefHat, order: 3, color: 'green' },
  { id: 'categories', to: '/categories', text: 'Categories', icon: Layers, order: 4, color: 'purple' },
  { id: 'toppings', to: '/toppings', text: 'Toppings', icon: Pizza, order: 5, color: 'orange' },
  { id: 'sauces', to: '/sauces', text: 'Sauces', icon: Droplets, order: 6, color: 'red' },
  { id: 'combos', to: '/combos', text: 'Combos', icon: Package, order: 7, color: 'yellow', badge: 'New' },
  { id: 'customers', to: '/customers', text: 'Customers', icon: Users, order: 8, color: 'indigo' },
  { id: 'orders', to: '/orders', text: 'Orders', icon: ShoppingCart, order: 9, color: 'green', badge: '12' },
  { id: 'kitchen', to: '/kitchen', text: 'Kitchen Display', icon: ChefHat, order: 9.5, color: 'red' },
  { id: 'feedback', to: '/feedback', text: 'Feedback', icon: MessageSquare, order: 10, color: 'pink' },
  { id: 'marketing', to: '/marketing', text: 'Marketing', icon: Megaphone, order: 10.5, color: 'teal' },
  { id: 'layout', to: '/layout', text: 'Layout Manager', icon: Layout, order: 11, color: 'teal' },
  { id: 'appearance', to: '/appearance', text: 'Appearance', icon: Palette, order: 12, color: 'violet' },
  { id: 'settings', to: '/settings', text: 'Settings', icon: Settings, order: 13, color: 'gray' },
  { id: 'live-logs', to: '/live-logs', text: 'Live Logs', icon: Monitor, order: 14, color: 'red' },
  { id: 'job-status', to: '/job-status', text: 'Job Status', icon: Activity, order: 15, color: 'indigo' },
  { id: 'discount-codes', to: '/discount-codes', text: 'Discount Codes', icon: Tag, order: 16, color: 'orange' },
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
      'analytics': 'dashboard', // Analytics uses dashboard permission
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
      'feedback': 'feedback',
      'marketing': 'marketing',
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
    <span className="ml-auto inline-flex items-center justify-center bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-full min-w-[20px]">
      {count}
    </span>
  );

  return (
    <aside className="w-64 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-2xl flex flex-col fixed">
      {/* Header */}
      <div className="h-16 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800 opacity-90"></div>
        <div className="relative z-10 text-center">
          <div className="font-bold text-xl text-white">Right Wingers</div>
          <div className="text-xs text-red-100 font-medium">Admin Panel</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-2">
          {filteredNavLinks.map(({ id, to, text, icon: Icon, badge, color = 'gray' }) => (
            <li key={id}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `group flex items-center p-3 rounded-xl font-medium transition-all duration-200 relative overflow-hidden ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-lg transform scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Background gradient for active state */}
                    {isActive && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} opacity-10 rounded-xl`}></div>
                    )}
                    
                    {/* Icon with gradient background */}
                    <div className={`relative z-10 p-2 rounded-lg mr-3 ${
                      isActive 
                        ? `bg-gradient-to-br ${colorClasses[color]} shadow-md` 
                        : 'bg-white/10 group-hover:bg-white/20'
                    } transition-all duration-200`}>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} />
                    </div>
                    
                    {/* Text */}
                    <span className="relative z-10 flex-1">{text}</span>
                    
                    {/* Badge */}
                    {badge && (
                      <span className={`relative z-10 px-2 py-1 text-xs font-bold rounded-full ${
                        isActive 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-red-500 text-white'
                      } ml-2`}>
                        {badge}
                      </span>
                    )}

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"></div>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-3 border border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Admin User</div>
              <div className="text-xs text-gray-400">Administrator</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}; 