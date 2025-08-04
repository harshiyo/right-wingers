import React, { useState, useEffect } from 'react';
import { Search, Bell, Settings, User, LogOut, Moon, Sun, Wifi, WifiOff, Sparkles, Zap, Clock, Calendar } from 'lucide-react';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { navLinks } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';
import logo from '../assets/logo.png';

type SearchResult = {
  type: string;
  label: string;
  to: string;
  id: string;
};

export const TopBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    try {
      // Clear selected store from localStorage
      localStorage.removeItem('selectedStore');
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setShowSearchDropdown(true);
    const timeout = setTimeout(async () => {
      const q = searchQuery.toLowerCase();
      let results: SearchResult[] = [];
      // 1. Settings/pages (navLinks)
      results = results.concat(
        navLinks
          .filter((link: any) => link.text.toLowerCase().includes(q))
          .map((link: any) => ({
            type: 'Setting',
            label: link.text,
            to: link.to,
            id: link.id
          }))
      );
      // 2. Menu Items
      const menuSnap = await getDocs(query(collection(db, 'menuItems')));
      menuSnap.forEach(doc => {
        const data = doc.data();
        if (data.name?.toLowerCase().includes(q)) {
          results.push({
            type: 'Menu Item',
            label: data.name,
            to: '/menu',
            id: doc.id
          });
        }
      });
      // 3. Sauces
      const sauceSnap = await getDocs(query(collection(db, 'sauces')));
      sauceSnap.forEach(doc => {
        const data = doc.data();
        if (data.name?.toLowerCase().includes(q)) {
          results.push({
            type: 'Sauce',
            label: data.name,
            to: '/sauces',
            id: doc.id
          });
        }
      });
      // 4. Toppings
      const toppingSnap = await getDocs(query(collection(db, 'toppings')));
      toppingSnap.forEach(doc => {
        const data = doc.data();
        if (data.name?.toLowerCase().includes(q)) {
          results.push({
            type: 'Topping',
            label: data.name,
            to: '/toppings',
            id: doc.id
          });
        }
      });
      // 5. Combos
      const comboSnap = await getDocs(query(collection(db, 'combos')));
      comboSnap.forEach(doc => {
        const data = doc.data();
        if (data.name?.toLowerCase().includes(q)) {
          results.push({
            type: 'Combo',
            label: data.name,
            to: '/combos',
            id: doc.id
          });
        }
      });
      // 6. Categories
      const catSnap = await getDocs(query(collection(db, 'categories')));
      catSnap.forEach(doc => {
        const data = doc.data();
        if (data.name?.toLowerCase().includes(q)) {
          results.push({
            type: 'Category',
            label: data.name,
            to: '/categories',
            id: doc.id
          });
        }
      });
      // 7. Customers
      const custSnap = await getDocs(query(collection(db, 'customers')));
      custSnap.forEach(doc => {
        const data = doc.data();
        if (
          data.name?.toLowerCase().includes(q) ||
          data.email?.toLowerCase().includes(q) ||
          data.phone?.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'Customer',
            label: data.name + (data.phone ? ` (${data.phone})` : ''),
            to: '/customers',
            id: doc.id
          });
        }
      });
      setSearchResults(results);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="h-20 bg-gradient-to-r from-white via-gray-50 to-white shadow-lg border-b border-gray-200 flex items-center justify-between px-6 relative z-50">
      {/* Enhanced Left Side - Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md relative">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items, orders, customers..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
            onFocus={() => searchQuery && setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
          />
          {/* Enhanced Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No matches found</p>
                </div>
              ) : (
                searchResults.map((result, idx) => (
                  <button
                    key={result.type + result.id + idx}
                    className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 flex items-center gap-3 border-b border-gray-50 last:border-b-0 transition-all duration-200"
                    onClick={() => navigate(result.to)}
                  >
                    <span className="text-xs font-semibold text-gray-500 w-20 flex-shrink-0 bg-gray-100 px-2 py-1 rounded-full">{result.type}</span>
                    <span className="font-medium text-gray-900">{result.label}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Center - Store Info with Logo */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          {/* Logo removed - only showing in sidebar */}
        </div>
      </div>

      {/* Enhanced Right Side - Actions & Info */}
      <div className="flex items-center gap-4">
        {/* Enhanced Connection Status */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-green-100 border border-green-200" title={isOnline ? "Online" : "Offline"}>
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <span className="text-xs font-medium text-gray-700 hidden sm:block">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Enhanced Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle Theme"
          className="hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 rounded-lg p-2"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Enhanced Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 rounded-lg p-2 relative"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center shadow-lg">
                {unreadCount}
              </span>
            )}
          </Button>

          <NotificationDropdown 
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* Enhanced Time & Date */}
        <div className="text-right hidden sm:block bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3 w-3 text-blue-600" />
            <div className="text-sm font-semibold text-gray-900">
              {formatTime(currentTime)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-purple-600" />
            <div className="text-xs text-gray-600">
              {formatDate(currentTime)}
            </div>
          </div>
        </div>

        {/* Enhanced User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 transition-all duration-200"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-900">{user?.name || 'Admin User'}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                {user?.role === 'master_admin' ? 'Master Admin' : 'Store Admin'}
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
                <p className="font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-gray-500">{user?.email || 'admin@rightwingers.com'}</p>
              </div>
              <div className="py-1">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 flex items-center gap-2 transition-all duration-200">
                  <User className="h-4 w-4" />
                  Profile Settings
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 flex items-center gap-2 transition-all duration-200">
                  <Settings className="h-4 w-4" />
                  System Settings
                </button>
                <hr className="my-1" />
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 flex items-center gap-2 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showUserMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </header>
  );
}; 