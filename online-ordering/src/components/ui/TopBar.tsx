import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, ChevronLeft } from 'lucide-react';
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
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Back Button & Title */}
          <div className="flex items-center gap-3 flex-1">
            {pageConfig.showBack && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {pageConfig.title && (
              <h1 className="text-lg font-semibold sm:hidden">{pageConfig.title}</h1>
            )}
          </div>

          {/* Center Section - Branding */}
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="/logo.png" 
                alt="Right Wingers" 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-sm"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent leading-tight">
                  Right Wingers
                </h1>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent">
                  Right Wingers
                </h1>
              </div>
            </div>
          </div>

          {/* Right Section - Customer Info & Cart */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            {/* Customer Info */}
            {customerInfo && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-gray-700">{customerInfo.fullName}</span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-600">{customerInfo.phone}</span>
              </div>
            )}

            {/* Cart Button */}
            {location.pathname !== '/cart' && (
              <button
                onClick={handleCartClick}
                className={cn(
                  "relative p-2 rounded-full transition-colors",
                  cartItemCount > 0 ? "bg-red-600 text-white" : "hover:bg-gray-100"
                )}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full Logo Section for Home Page */}
      {showLogo && (
        <div className="text-center py-8 bg-gradient-to-br from-orange-50 to-red-50">
          <img 
            src="/logo.png" 
            alt="Right Wingers" 
            className="w-32 h-32 mx-auto mb-4 rounded-full shadow-lg"
          />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent mb-2">
            Right Wingers
          </h1>
        </div>
      )}
    </div>
  );
} 