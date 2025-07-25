import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TopBar } from '../components/layout/TopBar';
import { Package, Clock, Calendar, ArrowRight, CheckCircle, User } from 'lucide-react';
import { Customer } from '../data/customers';

// Memoized pickup time option component
const PickupTimeOption = memo(({ 
  type, 
  icon: Icon, 
  title, 
  description, 
  features, 
  isSelected, 
  isKeyboardSelected, 
  onClick 
}: {
  type: 'asap' | 'scheduled';
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  features: { icon: React.ComponentType<any>; text: string }[];
  isSelected: boolean;
  isKeyboardSelected?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`group relative rounded-lg lg:rounded-xl border-2 p-4 lg:p-6 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 text-center h-full ${
      isSelected
        ? 'border-red-600 bg-red-50 shadow-lg'
        : isKeyboardSelected
        ? 'border-red-500 bg-red-50 shadow-md ring-2 ring-red-200'
        : 'border-gray-200 hover:border-red-300 hover:shadow-md'
    }`}
  >
    <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-3 transition-transform duration-150 shadow-lg ${
      type === 'asap' 
        ? 'bg-gradient-to-br from-red-700 to-red-800 group-hover:scale-105' 
        : 'bg-gradient-to-br from-orange-600 to-orange-700 group-hover:scale-105'
    }`}>
      <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
    </div>
    <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-1 lg:mb-2">{title}</h3>
    <p className="text-gray-600 mb-2 lg:mb-3 text-sm lg:text-base">{description}</p>
    
    <div className="space-y-1 text-sm text-gray-500">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center justify-center gap-2">
          <feature.icon className="h-4 w-4" />
          <span>{feature.text}</span>
        </div>
      ))}
    </div>
    
    {isSelected && (
      <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
        <CheckCircle className="h-4 w-4" />
        <span className="font-semibold text-sm">Selected!</span>
      </div>
    )}
    
    {isKeyboardSelected && !isSelected && (
      <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
        <div className="h-4 w-4 border-2 border-red-600 rounded-full animate-pulse" />
        <span className="font-semibold text-sm">Press Enter to Select</span>
      </div>
    )}
  </button>
));

PickupTimeOption.displayName = 'PickupTimeOption';

// Memoized customer info card component
const CustomerInfoCard = memo(({ 
  customer, 
  phone, 
  onNavigateToCustomerLookup 
}: {
  customer: Customer;
  phone: string;
  onNavigateToCustomerLookup: () => void;
}) => (
  <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 border border-gray-100 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-4 lg:mb-6">
      <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
        <User className="h-5 w-5 text-white" />
      </div>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900">Customer Information</h2>
    </div>
    
    <div className="flex-1 flex flex-col justify-center">
      <div className="space-y-3">
        <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="font-bold text-green-800 text-sm">Welcome back!</p>
              </div>
              <p className="text-lg font-bold text-gray-900">{customer.name}</p>
              <p className="text-xs text-gray-600">Customer since 2024</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onNavigateToCustomerLookup}
              className="text-green-700 hover:bg-green-100 text-xs px-2 py-1"
            >
              Not them?
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-blue-600 font-medium">Phone</p>
            <p className="text-lg font-bold text-gray-900">{phone}</p>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg">
            <p className="text-purple-600 font-medium">Order Type</p>
            <p className="font-semibold text-gray-900 text-sm">Pickup</p>
          </div>
        </div>
      </div>
    </div>
  </div>
));

CustomerInfoCard.displayName = 'CustomerInfoCard';

const PickupDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { customer, phone } = location.state || {};

  const [pickupTime, setPickupTime] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(0); // For keyboard navigation

  useEffect(() => {
    if (!customer || !phone) {
      navigate('/customer-lookup');
    }
  }, [customer, phone, navigate]);

  // Memoized handlers
  const handleNavigateToCustomerLookup = useCallback(() => {
    navigate('/customer-lookup');
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate('/order', { state: { customer, phone } });
  }, [navigate, customer, phone]);

  const handleConfirmPickup = useCallback(() => {
    navigate('/menu', { 
      state: { 
        customer, 
        phone, 
        orderType: 'pickup', 
        pickupTime, 
        scheduledDateTime 
      } 
    });
  }, [navigate, customer, phone, pickupTime, scheduledDateTime]);

  // Memoized pickup options data
  const pickupOptions = useMemo(() => [
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
        { icon: Calendar, text: 'Plan ahead for convenience' },
        { icon: Clock, text: 'Custom date & time' }
      ]
    }
  ], []);

  // Memoized derived state
  const isDetailsComplete = useMemo(() => 
    pickupTime === 'asap' || (pickupTime === 'scheduled' && scheduledDateTime !== ''),
    [pickupTime, scheduledDateTime]
  );

  // Keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setKeyboardSelectedIndex(0); // ASAP
          break;
        case 'ArrowRight':
          e.preventDefault();
          setKeyboardSelectedIndex(1); // Scheduled
          break;
        case 'Enter':
          e.preventDefault();
          const selectedOption = pickupOptions[keyboardSelectedIndex];
          if (selectedOption) {
            setPickupTime(selectedOption.type);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardSelectedIndex, pickupOptions]);

  if (!customer) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-orange-50">
      <TopBar 
        cartItemsCount={0}
        cartTotal={0}
        customerInfo={customer}
        orderType="Pickup"
        currentStep="details"
      />
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 pt-4 lg:pt-6">
        <div className="w-full max-w-7xl mx-auto space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 lg:gap-3 mb-2 lg:mb-4">
              <div className="p-2 lg:p-3 bg-gradient-to-br from-red-800 to-red-900 rounded-xl lg:rounded-2xl shadow-lg">
                <Package className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent">
                Pickup Details
              </h1>
            </div>
            <p className="text-gray-600 text-base lg:text-lg max-w-2xl mx-auto px-4">
              For <span className="font-bold text-gray-900">{customer.name}</span> ({phone})
            </p>
            <p className="text-gray-500 text-sm mt-2 flex items-center justify-center gap-2">
              <span className="hidden lg:inline">Use ← → arrows to navigate, Enter to select</span>
              <span className="lg:hidden">Use arrows & Enter to select</span>
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
            {/* Customer Info Card */}
            <div className="lg:col-span-1">
              <CustomerInfoCard
                customer={customer}
                phone={phone}
                onNavigateToCustomerLookup={handleNavigateToCustomerLookup}
              />
            </div>

            {/* Pickup Time Selection */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 border border-gray-100 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 lg:mb-6">
                  <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg lg:text-xl font-bold text-gray-900">When will this order be ready?</h2>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {pickupOptions.map((option, index) => (
                      <PickupTimeOption
                        key={option.type}
                        type={option.type}
                        icon={option.icon}
                        title={option.title}
                        description={option.description}
                        features={option.features}
                        isSelected={pickupTime === option.type}
                        isKeyboardSelected={keyboardSelectedIndex === index}
                        onClick={() => setPickupTime(option.type)}
                      />
                    ))}
                  </div>

                  {pickupTime === 'scheduled' && (
                    <div className="mt-4 bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule Pickup Time
                      </h3>
                      <Input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={(e) => setScheduledDateTime(e.target.value)}
                        min={new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)}
                        className="w-full"
                      />
                      <p className="text-xs text-purple-600 mt-2">
                        Minimum 30 minutes from now. Store hours: 11:00 AM - 10:00 PM
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <Button 
              variant="outline"
              className="sm:w-auto px-6 py-3 border-gray-300 hover:bg-gray-50"
              onClick={handleGoBack}
            >
              ← Go Back
            </Button>
            
            <Button 
              className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              size="lg" 
              disabled={!isDetailsComplete}
              onClick={handleConfirmPickup}
            >
              <span className="font-bold">Confirm Pickup Order</span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(PickupDetailsPage);