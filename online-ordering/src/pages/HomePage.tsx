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
    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 w-full text-left ${
      isSelected
        ? 'border-red-600 bg-red-50 shadow-lg'
        : 'border-gray-200 hover:border-red-300 hover:shadow-md bg-white'
    }`}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
      type === 'asap' 
        ? 'bg-gradient-to-br from-red-600 to-red-700' 
        : 'bg-gradient-to-br from-orange-600 to-orange-700'
    }`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-1">
            <feature.icon className="h-3 w-3" />
            <span>{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
    
    {isSelected && (
      <CheckCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
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
    if (type === 'delivery') {
      navigate('/delivery-details');
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Selected Store Display */}
        <div className="card-ux p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
                <StoreIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{selectedStore?.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedStore?.address}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleChangeStore}
              className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200 text-xs font-medium"
            >
              Change Store
            </button>
          </div>
        </div>
        
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Place Your Order</h2>
          <p className="text-sm text-gray-600">How would you like to receive your order?</p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Pickup Option */}
          <button
            onClick={() => handleOrderTypeSelect('pickup')}
            className={`flex items-center p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] ${
              orderType === 'pickup' ? 'border-red-600 bg-red-50 shadow-lg' : ''
            }`}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-lg font-bold text-gray-900">Pickup</h3>
              <p className="text-sm text-gray-600">Ready in 15-25 minutes</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">Fast & convenient</span>
              </div>
            </div>
            {orderType === 'pickup' && (
              <CheckCircle className="w-6 h-6 text-red-600" />
            )}
          </button>

          {/* Delivery Option */}
          <button
            onClick={() => handleOrderTypeSelect('delivery')}
            className={`flex items-center p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] ${
              orderType === 'delivery' ? 'border-red-600 bg-red-50 shadow-lg' : ''
            }`}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-lg font-bold text-gray-900">Delivery</h3>
              <p className="text-sm text-gray-600">30-45 minutes • $3.99 fee</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-xs text-gray-500">Free on orders $30+</span>
              </div>
            </div>
            {orderType === 'delivery' && (
              <CheckCircle className="w-6 h-6 text-red-600" />
            )}
          </button>
        </div>

        {/* Pickup Time Selection */}
        {orderType === 'pickup' && (
          <>
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Pickup Time</h3>
              <p className="text-sm text-gray-600">When would you like to pick up your order?</p>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4">
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
              <div className="card-ux p-5 mb-6">
                <label htmlFor="scheduledTime" className="block text-sm font-semibold text-gray-900 mb-2">
                  Select Pickup Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="scheduledTime"
                  value={scheduledDateTime}
                  onChange={(e) => handleScheduledDateTimeChange(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all duration-200"
                />
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!pickupTime || (pickupTime === 'scheduled' && !scheduledDateTime)}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <span className="text-lg">Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
} 