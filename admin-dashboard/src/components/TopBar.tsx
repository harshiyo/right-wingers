import React, { useState, useEffect } from 'react';
import { Search, Bell, Settings, User, LogOut, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { navLinks } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';

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
    <header className="h-16 bg-white shadow-lg border-b border-gray-200 flex items-center justify-between px-6 relative z-50">
      {/* Left Side - Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md relative">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items, orders, customers..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-colors"
            onFocus={() => searchQuery && setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
          />
          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 text-sm">No matches found</div>
              ) : (
                searchResults.map((result, idx) => (
                  <button
                    key={result.type + result.id + idx}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-b-0"
                    onClick={() => navigate(result.to)}
                  >
                    <span className="text-xs font-semibold text-gray-500 w-20 flex-shrink-0">{result.type}</span>
                    <span className="font-medium text-gray-900">{result.label}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center - Store Info */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">Right Wingers</div>
          <div className="text-xs text-gray-500">Admin Dashboard</div>
        </div>
      </div>

      {/* Right Side - Actions & Info */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2" title={isOnline ? "Online" : "Offline"}>
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <span className="text-xs text-gray-500 hidden sm:block">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle Theme"
          className="hover:bg-gray-100"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="hover:bg-gray-100 relative"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>

          <NotificationDropdown 
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* Time & Date */}
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-gray-900">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-900">{user?.name || 'Admin User'}</div>
              <div className="text-xs text-gray-500">{user?.role === 'master_admin' ? 'Master Administrator' : 'Store Administrator'}</div>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-gray-500">{user?.email || 'admin@rightwingers.com'}</p>
              </div>
              <div className="py-1">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile Settings
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  System Settings
                </button>
                <hr className="my-1" />
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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