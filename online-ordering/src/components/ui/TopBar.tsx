import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, ChevronLeft, MapPin } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
import { cn } from '../../utils/cn';

interface TopBarProps {
  showLogo?: boolean;
}

export default function TopBar({ showLogo }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems } = useCart();
  const { customerInfo } = useCustomer();

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const handleBack = () => {
    navigate(-1);
  };

  const handleCartClick = () => {
    navigate('/cart');
  };

  // Configure TopBar content based on current route
  const getPageConfig = () => {
    switch (location.pathname) {
      case '/menu':
        return { title: 'Menu', showBack: true };
      case '/cart':
        return { title: 'Your Cart', showBack: true };
      case '/delivery-details':
        return { title: 'Delivery Details', showBack: true };
      case '/customer-info':
        return { title: 'Customer Information', showBack: true };
      case '/checkout':
        return { title: 'Checkout', showBack: true };
      case '/confirmation':
        return { title: 'Order Confirmation', showBack: false };
      case '/select-store':
        return { title: 'Select Store', showBack: false };
      default:
        return { showBack: false };
    }
  };

  const pageConfig = getPageConfig();

  return (
    <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 shadow-xl border-b border-red-500/30 sticky top-0 z-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-32 bg-red-400/20 rounded-full blur-xl"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400/20 rounded-full blur-lg"></div>
        <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-yellow-400/20 rounded-full blur-lg"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 relative z-10">
        <div className="flex items-center justify-between">
          {/* Left Section - Back Button & Title */}
          <div className="flex items-center gap-3 flex-1">
            {pageConfig.showBack && (
              <button
                onClick={handleBack}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 active:scale-95 backdrop-blur-sm border border-white/20"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
            )}
            {pageConfig.title && (
              <h1 className="text-lg font-semibold text-white sm:hidden drop-shadow-sm">{pageConfig.title}</h1>
            )}
          </div>

          {/* Center Section - Branding */}
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-lg"></div>
                <img 
                  src="/logo.png" 
                  alt="Right Wingers" 
                  className="w-20 h-20 sm:w-20 sm:h-20 rounded-2xl relative z-10"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white leading-tight drop-shadow-sm">
                  Right Wingers
                </h1>
                <p className="text-xs text-red-100 font-medium">DELIVERY & TAKE-OUT</p>
              </div>
            </div>
          </div>

          {/* Right Section - Customer Info & Cart */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Customer Info */}
            {customerInfo && (
              <div className="hidden lg:flex items-center gap-3 text-sm bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                <User className="h-4 w-4 text-red-100" />
                <span className="text-white font-medium">{customerInfo.fullName}</span>
                <div className="w-px h-4 bg-white/30"></div>
                <span className="text-red-100">{customerInfo.phone}</span>
              </div>
            )}

            {/* Cart Button */}
            {location.pathname !== '/cart' && (
              <div className="relative">
                <button
                  onClick={handleCartClick}
                  className={cn(
                    "relative p-3 rounded-xl transition-all duration-200 active:scale-95 backdrop-blur-sm border",
                    cartItemCount > 0 
                      ? "bg-yellow-500 hover:bg-yellow-400 text-white shadow-lg border-yellow-400" 
                      : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  )}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white">
                      {cartItemCount}
                    </span>
                  )}
                </button>
                {/* Button glow effect */}
                {cartItemCount > 0 && (
                  <div className="absolute inset-0 bg-yellow-400/30 rounded-xl blur-lg -z-10"></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Logo Section for Home Page */}
      {showLogo && (
        <div className="text-center py-12 bg-gradient-to-br from-red-50 to-orange-50 border-b border-red-200/50 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-red-200/30 rounded-full blur-xl"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 bg-orange-200/30 rounded-full blur-lg"></div>
          </div>
          
          <div className="relative z-10">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-red-200 rounded-3xl blur-2xl opacity-40"></div>
              <img 
                src="/logo.png" 
                alt="Right Wingers" 
                className="w-32 h-32 mx-auto rounded-3xl relative z-10"
              />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-700 to-red-600 bg-clip-text text-transparent mb-2 drop-shadow-sm">
              Right Wingers
            </h1>
            <p className="text-gray-600 font-medium">DELIVERY & TAKE-OUT</p>
          </div>
        </div>
      )}
    </div>
  );
} 