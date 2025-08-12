import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TopBar } from '../components/layout/TopBar';
import { Package, Clock, Calendar, ArrowRight, CheckCircle, User, AlertTriangle, X } from 'lucide-react';
import { Customer } from '../data/customers';

// Constants
const STORE_HOURS = {
  open: 11, // 11:00 AM
  close: 22, // 10:00 PM
  minAdvance: 30 // 30 minutes minimum advance
};

// Error dialog component for better UX
const ErrorDialog = ({ 
  isOpen, 
  onClose, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-red-700 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

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
    aria-label={`Select ${title} pickup option`}
    aria-pressed={isSelected}
  >
    <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-3 transition-transform duration-150 shadow-lg ${
      type === 'asap' 
        ? 'bg-gradient-to-br from-red-700 to-red-800 group-hover:scale-105' 
        : 'bg-gradient-to-br from-orange-600 to-orange-700 group-hover:scale-105'
    }`}>
      <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white" aria-hidden="true" />
    </div>
    <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-1 lg:mb-2">{title}</h3>
    <p className="text-gray-600 mb-2 lg:mb-3 text-sm lg:text-base">{description}</p>
    
    <div className="space-y-1 text-sm text-gray-500">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center justify-center gap-2">
          <feature.icon className="h-4 w-4" aria-hidden="true" />
          <span>{feature.text}</span>
        </div>
      ))}
    </div>
    
    {isSelected && (
      <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        <span className="font-semibold text-sm">Selected!</span>
      </div>
    )}
    
    {isKeyboardSelected && !isSelected && (
      <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
        <div className="h-4 w-4 border-2 border-red-600 rounded-full animate-pulse" aria-hidden="true" />
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
  customer: Customer | null;
  phone: string;
  onNavigateToCustomerLookup: () => void;
}) => {
  if (!customer) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
          <User className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-4">
          {/* Enhanced Customer Status Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 opacity-10 rounded-full -mr-8 -mt-8"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-full shadow-sm">
                    <CheckCircle className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-green-800 text-base leading-tight">
                      {customer.orderCount > 0 ? 'Welcome back!' : 'New customer!'}
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      {customer.orderCount > 0 ? 'We\'re glad to see you again' : 'Let\'s get you started'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onNavigateToCustomerLookup}
                  className="text-green-700 hover:bg-green-100 text-xs px-3 py-1.5 font-medium"
                  aria-label="Change customer"
                >
                  Not them?
                </Button>
              </div>
              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{customer.name}</p>
                <p className="text-sm text-gray-600 font-medium">
                  {customer.orderCount > 0 
                    ? `Customer since ${new Date(customer.lastOrderDate).getFullYear()}`
                    : 'First time ordering'
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Enhanced Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 p-4">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 opacity-10 rounded-full -mr-4 -mt-4"></div>
              <div className="relative">
                <p className="text-red-600 font-semibold text-xs mb-2 uppercase tracking-wide">Phone</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{phone}</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 opacity-10 rounded-full -mr-4 -mt-4"></div>
              <div className="relative">
                <p className="text-orange-600 font-semibold text-xs mb-2 uppercase tracking-wide">Order Type</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">Pickup</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CustomerInfoCard.displayName = 'CustomerInfoCard';

const PickupDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { customer, phone } = location.state || {};

  const [pickupTime, setPickupTime] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(0); // For keyboard navigation
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (!customer || !phone) {
      navigate('/customer-lookup');
    }
  }, [customer, phone, navigate]);

  // Validate scheduled date/time
  const validateScheduledDateTime = useCallback((dateTime: string): string => {
    if (!dateTime) return 'Please select a pickup date and time.';
    
    const selectedDate = new Date(dateTime);
    const now = new Date();
    const minTime = new Date(now.getTime() + STORE_HOURS.minAdvance * 60 * 1000);
    
    if (selectedDate < minTime) {
      return `Pickup time must be at least ${STORE_HOURS.minAdvance} minutes from now.`;
    }
    
    const selectedHour = selectedDate.getHours();
    if (selectedHour < STORE_HOURS.open || selectedHour >= STORE_HOURS.close) {
      return `Store hours are ${STORE_HOURS.open}:00 AM - ${STORE_HOURS.close}:00 PM.`;
    }
    
    return '';
  }, []);

  // Handle scheduled date/time changes
  const handleScheduledDateTimeChange = useCallback((dateTime: string) => {
    setScheduledDateTime(dateTime);
    const error = validateScheduledDateTime(dateTime);
    setValidationError(error);
  }, [validateScheduledDateTime]);

  // Memoized handlers
  const handleNavigateToCustomerLookup = useCallback(() => {
    navigate('/customer-lookup');
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate('/order', { state: { customer, phone } });
  }, [navigate, customer, phone]);

  const handleConfirmPickup = useCallback(() => {
    if (pickupTime === 'scheduled') {
      const error = validateScheduledDateTime(scheduledDateTime);
      if (error) {
        setValidationError(error);
        setErrorDialog({
          isOpen: true,
          title: 'Invalid Pickup Time',
          message: error
        });
        return;
      }
    }

    navigate('/menu', { 
      state: { 
        customer, 
        phone, 
        orderType: 'pickup', 
        pickupTime, 
        scheduledDateTime 
      } 
    });
  }, [navigate, customer, phone, pickupTime, scheduledDateTime, validateScheduledDateTime]);

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
    pickupTime === 'asap' || (pickupTime === 'scheduled' && scheduledDateTime !== '' && !validationError),
    [pickupTime, scheduledDateTime, validationError]
  );

  // Get minimum datetime for input
  const minDateTime = useMemo(() => {
    const minTime = new Date(Date.now() + STORE_HOURS.minAdvance * 60 * 1000);
    return minTime.toISOString().slice(0, 16);
  }, []);

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
        case 'Escape':
          e.preventDefault();
          handleGoBack();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardSelectedIndex, pickupOptions, handleGoBack]);

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
        onQuickAddClick={() => {}}
      />
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 pt-4 lg:pt-6">
        <div className="w-full max-w-7xl mx-auto space-y-4 lg:gap-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 lg:gap-3 mb-2 lg:mb-4">
              <div className="p-2 lg:p-3 bg-gradient-to-br from-red-800 to-red-900 rounded-xl lg:rounded-2xl shadow-lg">
                <Package className="h-6 w-6 lg:h-8 lg:w-8 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent">
                Pickup Details
              </h1>
            </div>
            <p className="text-gray-600 text-base lg:text-lg max-w-2xl mx-auto px-4">
              For <span className="font-bold text-gray-900">{customer.name}</span> ({phone})
            </p>
            <p className="text-gray-500 text-sm mt-2 flex items-center justify-center gap-2">
              <span className="hidden lg:inline">Use ← → arrows to navigate, Enter to select, Esc to go back</span>
              <span className="lg:hidden">Use arrows & Enter to select, Esc to go back</span>
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
                    <Clock className="h-5 w-5 text-white" aria-hidden="true" />
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
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        Schedule Pickup Time
                      </h3>
                      <Input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={(e) => handleScheduledDateTimeChange(e.target.value)}
                        min={minDateTime}
                        className={`w-full ${validationError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
                        aria-describedby={validationError ? 'datetime-error' : undefined}
                      />
                      {validationError && (
                        <p id="datetime-error" className="text-red-600 text-sm mt-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                          {validationError}
                        </p>
                      )}
                      <p className="text-xs text-purple-600 mt-2">
                        Minimum {STORE_HOURS.minAdvance} minutes from now. Store hours: {STORE_HOURS.open}:00 AM - {STORE_HOURS.close}:00 PM
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
              aria-label="Go back to order type selection"
            >
              ← Go Back
            </Button>
            
            <Button 
              className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              size="lg" 
              disabled={!isDetailsComplete}
              onClick={handleConfirmPickup}
              aria-label="Confirm pickup order and proceed to menu"
            >
              <span className="font-bold">Confirm Pickup Order</span>
              <ArrowRight className="h-5 w-5 ml-2" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
        title={errorDialog.title}
        message={errorDialog.message}
      />
    </div>
  );
};

export default memo(PickupDetailsPage);