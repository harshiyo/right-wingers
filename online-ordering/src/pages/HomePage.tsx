import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Truck, Package, Calendar, ArrowRight, CheckCircle, MapPin, Store as StoreIcon } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCustomer } from '../context/CustomerContext';

// Pickup Time Option Component
const PickupTimeOption = ({ 
  type, 
  icon: Icon, 
  title, 
  description, 
  features, 
  isSelected, 
  onClick 
}: {
  type: 'asap' | 'scheduled';
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  features: { icon: React.ComponentType<any>; text: string }[];
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 w-full text-center group relative overflow-hidden ${
      isSelected
        ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
        : 'border-gray-200 hover:border-red-300 hover:shadow-md bg-white/80 backdrop-blur-sm'
    }`}
  >
    {/* Selected state glow effect */}
    {isSelected && (
      <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 opacity-50 blur-sm"></div>
    )}
    
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg relative z-10 ${
      type === 'asap' 
        ? 'bg-gradient-to-br from-red-600 to-red-700' 
        : 'bg-gradient-to-br from-orange-600 to-orange-700'
    }`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    
    <div className="flex-1 min-w-0 relative z-10">
      <h3 className={`text-base font-bold mb-1 ${
        isSelected ? 'text-green-800' : 'text-gray-900'
      }`}>{title}</h3>
      <p className={`text-xs mb-2 ${
        isSelected ? 'text-green-700' : 'text-gray-600'
      }`}>{description}</p>
      <div className={`flex flex-col items-center gap-1 text-xs ${
        isSelected ? 'text-green-600' : 'text-gray-500'
      }`}>
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-1">
            <feature.icon className="h-3 w-3" />
            <span>{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
    
    {isSelected && (
      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 relative z-10" />
    )}
  </button>
);

export default function HomePage() {
  const navigate = useNavigate();
  const { selectedStore, clearSelectedStore } = useStore();
  const { customerInfo, updateCustomerInfo } = useCustomer();
  const [orderType, setOrderType] = useState<'pickup' | 'delivery' | null>(customerInfo?.orderType || null);
  const [pickupTime, setPickupTime] = useState<'asap' | 'scheduled' | null>(customerInfo?.pickupTime || null);
  const [scheduledDateTime, setScheduledDateTime] = useState(customerInfo?.scheduledDateTime || '');

  const handleChangeStore = () => {
    clearSelectedStore();
    navigate('/select-store');
  };

  const handleOrderTypeSelect = (type: 'pickup' | 'delivery') => {
    setOrderType(type);
    updateCustomerInfo({ orderType: type });
    // Don't navigate to delivery details immediately - let the user complete the flow first
  };

  const handlePickupTimeSelect = (time: 'asap' | 'scheduled') => {
    setPickupTime(time);
    updateCustomerInfo({ pickupTime: time });
    if (time === 'asap') {
      updateCustomerInfo({ scheduledDateTime: undefined });
    }
  };

  const handleContinue = () => {
    if (orderType === 'pickup') {
      updateCustomerInfo({
        orderType,
        pickupTime: pickupTime || 'asap',
        scheduledDateTime: pickupTime === 'scheduled' ? scheduledDateTime : undefined
      });
      navigate('/customer-info');
    } else if (orderType === 'delivery') {
      updateCustomerInfo({
        orderType,
        pickupTime: pickupTime || 'asap',
        scheduledDateTime: pickupTime === 'scheduled' ? scheduledDateTime : undefined
      });
      navigate('/customer-info');
    }
  };

  // Handle scheduled datetime changes
  const handleScheduledDateTimeChange = (value: string) => {
    setScheduledDateTime(value);
    updateCustomerInfo({ scheduledDateTime: value });
  };

  // Pickup time options data
  const pickupTimeOptions = [
    {
      type: 'asap' as const,
      icon: Clock,
      title: 'ASAP',
      description: 'Ready in 15-25 minutes',
      features: [
        { icon: Clock, text: 'Faster service' },
        { icon: CheckCircle, text: 'Start preparing immediately' }
      ]
    },
    {
      type: 'scheduled' as const,
      icon: Calendar,
      title: 'Schedule for Later',
      description: 'Choose specific date and time',
      features: [
        { icon: Calendar, text: 'Plan ahead' },
        { icon: Clock, text: 'Custom date & time' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-br from-red-200 to-orange-200 rounded-full opacity-30 blur-2xl"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-br from-orange-200 to-yellow-200 rounded-full opacity-40 blur-2xl"></div>
        <div className="absolute bottom-40 left-20 w-36 h-36 bg-gradient-to-br from-yellow-200 to-red-100 rounded-full opacity-35 blur-2xl"></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-gradient-to-br from-red-100 to-pink-100 rounded-full opacity-45 blur-2xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Selected Store Display */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                <StoreIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selectedStore?.name}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedStore?.address}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleChangeStore}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 text-sm font-medium border border-red-200 hover:border-red-300"
            >
              Change Store
            </button>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3 drop-shadow-sm">Place Your Order</h2>
          <p className="text-lg text-gray-600">How would you like to receive your order?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Pickup Option */}
          <button
            onClick={() => handleOrderTypeSelect('pickup')}
            className={`flex flex-col items-center p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-md border-2 transition-all duration-300 transform hover:scale-[1.02] group relative overflow-hidden text-center ${
              orderType === 'pickup' 
                ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg' 
                : 'border-gray-200 hover:border-red-300 hover:shadow-lg'
            }`}
          >
            {/* Selected state glow effect */}
            {orderType === 'pickup' && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 opacity-50 blur-sm"></div>
            )}
            
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center mb-3 shadow-lg relative z-10">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className={`text-lg font-bold mb-1 ${
                orderType === 'pickup' ? 'text-green-800' : 'text-gray-900'
              }`}>Pickup</h3>
              <p className={`text-sm mb-2 ${
                orderType === 'pickup' ? 'text-green-700' : 'text-gray-600'
              }`}>Ready in 15-25 minutes</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className={`text-xs ${
                  orderType === 'pickup' ? 'text-green-600' : 'text-gray-500'
                }`}>Fast & convenient</span>
              </div>
            </div>
            {orderType === 'pickup' && (
              <CheckCircle className="w-5 h-5 text-green-600 relative z-10 mt-2" />
            )}
          </button>

          {/* Delivery Option */}
          <button
            onClick={() => handleOrderTypeSelect('delivery')}
            className={`flex flex-col items-center p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-md border-2 transition-all duration-300 transform hover:scale-[1.02] group relative overflow-hidden text-center ${
              orderType === 'delivery' 
                ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg' 
                : 'border-gray-200 hover:border-red-300 hover:shadow-lg'
            }`}
          >
            {/* Selected state glow effect */}
            {orderType === 'delivery' && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 opacity-50 blur-sm"></div>
            )}
            
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center mb-3 shadow-lg relative z-10">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className={`text-lg font-bold mb-1 ${
                orderType === 'delivery' ? 'text-green-800' : 'text-gray-900'
              }`}>Delivery</h3>
              <p className={`text-sm mb-2 ${
                orderType === 'delivery' ? 'text-green-700' : 'text-gray-600'
              }`}>30-45 minutes</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className={`text-xs ${
                  orderType === 'delivery' ? 'text-green-600' : 'text-gray-500'
                }`}>Brought to your door</span>
              </div>
            </div>
            {orderType === 'delivery' && (
              <CheckCircle className="w-5 h-5 text-green-600 relative z-10 mt-2" />
            )}
          </button>
        </div>

        {/* Pickup Time Selection */}
        {orderType && (
          <>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 drop-shadow-sm">
                {orderType === 'pickup' ? 'Pickup Time' : 'Delivery Time'}
              </h3>
              <p className="text-lg text-gray-600">
                {orderType === 'pickup' 
                  ? 'When would you like to pick up your order?' 
                  : 'When would you like your order delivered?'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {pickupTimeOptions.map((option) => (
                <PickupTimeOption
                  key={option.type}
                  {...option}
                  isSelected={pickupTime === option.type}
                  onClick={() => handlePickupTimeSelect(option.type)}
                />
              ))}
            </div>

            {/* Scheduled Time Input */}
            {pickupTime === 'scheduled' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/60">
                <label htmlFor="scheduledTime" className="block text-base font-semibold text-gray-900 mb-3">
                  Select {orderType === 'pickup' ? 'Pickup' : 'Delivery'} Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="scheduledTime"
                  value={scheduledDateTime}
                  onChange={(e) => handleScheduledDateTimeChange(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full text-base px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                />
              </div>
            )}

            {/* Continue Button */}
            <div className="relative">
              <button
                onClick={handleContinue}
                disabled={!pickupTime || (pickupTime === 'scheduled' && !scheduledDateTime)}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-5 px-6 rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3 text-lg relative overflow-hidden group"
              >
                {/* Button glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                
                <span>Continue</span>
                <ArrowRight className="w-6 h-6" />
              </button>
              {/* Button shadow */}
              <div className="absolute inset-0 bg-red-900/20 rounded-2xl blur-lg -z-10"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 