import { useEffect, useState } from 'react';
import {
  LogOut, User, ShoppingCart, Truck, MapPin, CheckCircle, Search, Sun, Moon, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import Logo from '../../assets/logo.png';
import { OrderNotificationDialog } from './OrderNotificationDialog';
import { SettingsDialog } from './SettingsDialog';

interface TopBarProps {
  cartItemsCount?: number;
  cartTotal?: number;
  customerInfo?: any;
  orderType?: string;
  currentStep?: string;
  onQuickAddClick: () => void;
}

export const TopBar = ({
  cartItemsCount = 0,
  cartTotal = 0,
  customerInfo,
  orderType = 'Pickup',
  currentStep = 'menu',
  onQuickAddClick
}: TopBarProps) => {
  const [dark, setDark] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { currentStore, currentUser, logout } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('darkMode') || 'false');
    if (saved) setDark(true);
  }, []);

  // Keyboard shortcut for opening orders dialog (Ctrl + O)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl + O is pressed
      if (event.ctrlKey && event.key === 'o') {
        event.preventDefault(); // Prevent default browser behavior
        setOrdersOpen(true);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDark = () => {
    const val = !dark;
    setDark(val);
    document.documentElement.classList.toggle('dark', val);
    localStorage.setItem('darkMode', JSON.stringify(val));
  };

  const steps = [
    { key: 'customer', label: 'Customer', icon: User },
    { key: 'orderType', label: 'Order Type', icon: Truck },
    { key: 'details', label: 'Details', icon: MapPin },
    { key: 'menu', label: 'Menu', icon: ShoppingCart },
    { key: 'checkout', label: 'Checkout', icon: CheckCircle }
  ];

  const currentIndex = steps.findIndex(s => s.key === currentStep);
  const displayOrderType = orderType.charAt(0).toUpperCase() + orderType.slice(1);

  return (
    <>
      <header className="sticky top-0 z-50 w-full h-[90px] px-6 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 shadow flex items-center justify-between overflow-hidden">

        {/* Left Zone */}
        <div className="flex items-center gap-5 w-[35%] min-w-[340px]">
          <div className="relative">
            <img src={Logo} className="h-12 w-auto" alt="Right Wingers Logo" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
          </div>
          <div>
            <div className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">Right Wingers</div>
            <div className="text-sm font-medium text-red-700 dark:text-red-400">{currentStore?.name?.split(' - ')[1] || 'No Store'}</div>
          </div>

          {/* Order Type & Customer Info */}
          <div className="flex flex-col gap-1 px-4 py-1 rounded-xl border border-gray-300 bg-white dark:bg-zinc-800 shadow">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-300">
              Order Type: <span className="text-red-600 font-bold">{displayOrderType}</span>
            </div>
            {customerInfo?.name && (
              <div className="text-xs font-bold text-gray-800 dark:text-white truncate">{customerInfo.name}</div>
            )}
            {customerInfo?.phone && (
              <div className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-300 truncate">{customerInfo.phone}</div>
            )}
          </div>

          {/* View Orders Button (Outside Info Box) */}
          <button
            onClick={() => setOrdersOpen(true)}
            className="ml-2 px-3 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded shadow"
            title="View Orders (Ctrl + O)"
          >
            View Orders
          </button>
        </div>

        {/* Center Zone */}
        <div className="flex-1 flex items-center justify-center gap-8">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex flex-col items-center justify-center w-[70px]">
              <step.icon className={`w-6 h-6 ${currentIndex === idx ? 'text-red-700' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${currentIndex === idx ? 'text-red-700' : 'text-gray-500'}`}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Right Zone */}
        <div className="flex items-center justify-end gap-3 w-[30%] min-w-[320px]">
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 shadow text-sm font-bold text-red-700">
            <ShoppingCart className="w-5 h-5" />
            <span>{cartItemsCount} • ${cartTotal.toFixed(2)}</span>
          </div>
          {currentStep === 'menu' && (
            <button onClick={onQuickAddClick} className="p-2 rounded-full hover:bg-red-100 transition">
              <Search className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900 rounded-xl border border-red-200 dark:border-red-600 shadow">
              <div className="w-8 h-8 bg-red-700 text-white rounded-full flex items-center justify-center font-bold">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs">
                <div className="font-bold text-gray-800 dark:text-white truncate max-w-[100px]">{currentUser.name}</div>
                <div className="text-red-700 dark:text-red-300 text-[10px] font-medium truncate">{currentUser.role?.replace('_', ' ')}</div>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => setSettingsOpen(true)} 
            className="p-2 rounded-full hover:bg-red-100 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          
          <button onClick={logout} className="p-2 rounded-full hover:bg-red-100">
            <LogOut className="text-red-600" />
          </button>
        </div>
      </header>

      {/* Order Dialog */}
      <OrderNotificationDialog open={ordersOpen} onClose={() => setOrdersOpen(false)} />
      
      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};
