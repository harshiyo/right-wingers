import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TopBar } from '../components/layout/TopBar';
import { Truck, MapPin, Home, ArrowRight, CheckCircle, User, Clock, Calendar, AlertTriangle, X } from 'lucide-react';
import { Customer, updateCustomerAddress, calculateDrivingDistance, findCustomerByPhone } from '../data/customers';
import { useStore } from '../context/StoreContext';
import AddressAutocomplete from '../components/AddressAutocomplete';

// Constants
const STORE_HOURS = {
  open: 11, // 11:00 AM
  close: 22, // 10:00 PM
  minAdvance: 45 // 45 minutes minimum advance for delivery
};

const MAX_DELIVERY_DISTANCE = 25; // Maximum delivery distance in km

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
                <p className="text-lg font-bold text-gray-900 leading-tight">Delivery</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CustomerInfoCard.displayName = 'CustomerInfoCard';

// Memoized address form component
const AddressForm = memo(({ 
  onAddressSelect,
  onAddressChange,
  fullAddress,
  distance,
  isLoadingDistance,
  isCachedDistance,
  isComplete,
  deliveryTimeType,
  setDeliveryTimeType,
  scheduledDeliveryDateTime,
  setScheduledDeliveryDateTime,
  validationError
}: {
  onAddressSelect: (address: { street: string; city: string; postalCode: string; fullAddress: string; lat?: number; lon?: number }) => void;
  onAddressChange: (value: string) => void;
  fullAddress: string;
  distance: number | null;
  isLoadingDistance: boolean;
  isCachedDistance: boolean;
  isComplete: boolean;
  deliveryTimeType: 'asap' | 'scheduled';
  setDeliveryTimeType: (type: 'asap' | 'scheduled') => void;
  scheduledDeliveryDateTime: string;
  setScheduledDeliveryDateTime: (datetime: string) => void;
  validationError: string;
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-6">
      <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
        <MapPin className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Where should we deliver this order?</h2>
    </div>
    
    <div className="flex-1 flex flex-col">
      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="delivery-address" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              Delivery Address
            </label>
            <AddressAutocomplete
              value={fullAddress}
              onChange={onAddressChange}
              onAddressSelect={onAddressSelect}
              placeholder="Enter your delivery address"
              className="w-full"
              aria-describedby="address-help"
            />
            <p id="address-help" className="mt-1 text-xs text-gray-500">
              Start typing to see address suggestions (Ontario, Canada only, 7+ characters)
            </p>
          </div>
        </div>

        {/* Distance Information */}
        {isLoadingDistance && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-blue-700 text-sm flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              Calculating distance...
            </p>
          </div>
        )}
        {distance !== null && !isNaN(distance) && !isLoadingDistance && (
          <div className={`rounded-lg p-3 border ${
            distance > MAX_DELIVERY_DISTANCE 
              ? 'bg-red-50 border-red-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm flex items-center gap-1 ${
              distance > MAX_DELIVERY_DISTANCE ? 'text-red-700' : 'text-blue-700'
            }`}>
              <MapPin className="h-3 w-3" aria-hidden="true" />
              Distance: {distance.toFixed(1)} km
              {isCachedDistance && (
                <span className="text-xs text-green-600 ml-1">(cached)</span>
              )}
              {distance > MAX_DELIVERY_DISTANCE && (
                <span className="text-xs text-red-600 ml-1">(outside delivery range)</span>
              )}
            </p>
          </div>
        )}

        {/* Delivery Time Selection */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" aria-hidden="true" />
            When should we deliver?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              className={`group relative rounded-lg border-2 p-4 transition-colors duration-200 focus:outline-none text-center h-full ${
                deliveryTimeType === 'asap' 
                  ? 'border-orange-600 bg-orange-50 shadow-lg' 
                  : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
              }`}
              onClick={() => setDeliveryTimeType('asap')}
              aria-label="Select ASAP delivery"
              aria-pressed={deliveryTimeType === 'asap'}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 bg-gradient-to-br from-orange-600 to-orange-700">
                <Clock className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">ASAP</h4>
              <p className="text-gray-600 text-xs">Delivered in 30-45 minutes</p>
              {deliveryTimeType === 'asap' && (
                <div className="mt-2 flex items-center justify-center gap-1 text-orange-600">
                  <CheckCircle className="h-3 w-3" aria-hidden="true" />
                  <span className="font-semibold text-xs">Selected!</span>
                </div>
              )}
            </button>
            <button
              className={`group relative rounded-lg border-2 p-4 transition-colors duration-200 focus:outline-none text-center h-full ${
                deliveryTimeType === 'scheduled' 
                  ? 'border-orange-600 bg-orange-50 shadow-lg' 
                  : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
              }`}
              onClick={() => setDeliveryTimeType('scheduled')}
              aria-label="Select scheduled delivery"
              aria-pressed={deliveryTimeType === 'scheduled'}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 bg-gradient-to-br from-orange-600 to-orange-700">
                <Calendar className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">Schedule for Later</h4>
              <p className="text-gray-600 text-xs">Choose specific date and time</p>
              {deliveryTimeType === 'scheduled' && (
                <div className="mt-2 flex items-center justify-center gap-1 text-orange-600">
                  <CheckCircle className="h-3 w-3" aria-hidden="true" />
                  <span className="font-semibold text-xs">Selected!</span>
                </div>
              )}
            </button>
          </div>
          {deliveryTimeType === 'scheduled' && (
            <div className="mt-3 bg-orange-50 rounded-lg p-3 border border-orange-200">
              <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                Schedule Delivery Time
              </h4>
              <Input
                type="datetime-local"
                value={scheduledDeliveryDateTime}
                onChange={e => setScheduledDeliveryDateTime(e.target.value)}
                min={new Date(Date.now() + STORE_HOURS.minAdvance * 60 * 1000).toISOString().slice(0, 16)}
                className={`w-full text-sm ${validationError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
                aria-describedby={validationError ? 'datetime-error' : undefined}
              />
              {validationError && (
                <p id="datetime-error" className="text-red-600 text-sm mt-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {validationError}
                </p>
              )}
              <p className="text-xs text-orange-600 mt-1">
                Minimum {STORE_HOURS.minAdvance} minutes from now. Store hours: {STORE_HOURS.open}:00 AM - {STORE_HOURS.close}:00 PM
              </p>
            </div>
          )}
        </div>

        {!isComplete && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              Please fill in all address fields to continue.
            </p>
          </div>
        )}

        {distance !== null && distance > MAX_DELIVERY_DISTANCE && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 text-center">
              ⚠️ This address is outside our delivery range ({MAX_DELIVERY_DISTANCE} km). Please choose a closer address or select pickup instead.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
));

AddressForm.displayName = 'AddressForm';

const DeliveryDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStore } = useStore();
  
  const { 
    customer: initialCustomer, 
    phone, 
    cartItems, 
    distance: incomingDistance, 
    deliveryAddress: incomingDeliveryAddress, 
    orderType: incomingOrderType 
  } = location.state || {};

  const [customer, setCustomer] = useState<Customer | null>(initialCustomer || null);
  const [deliveryAddress, setDeliveryAddress] = useState<{
    street: string;
    city: string;
    postalCode: string;
    lat?: number;
    lon?: number;
  }>({
    street: '', city: '', postalCode: '', lat: undefined, lon: undefined
  });
  const [fullAddress, setFullAddress] = useState('');
  const [distance, setDistance] = useState<number | null>(incomingDistance || null);
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [isCachedDistance, setIsCachedDistance] = useState(false);
  const [deliveryTimeType, setDeliveryTimeType] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledDeliveryDateTime, setScheduledDeliveryDateTime] = useState('');
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [validationError, setValidationError] = useState<string>('');

  // Validate scheduled delivery datetime
  const validateScheduledDateTime = useCallback((dateTime: string): string => {
    if (!dateTime) return 'Please select a delivery date and time.';
    
    const selectedDate = new Date(dateTime);
    const now = new Date();
    const minTime = new Date(now.getTime() + STORE_HOURS.minAdvance * 60 * 1000);
    
    if (selectedDate < minTime) {
      return `Delivery time must be at least ${STORE_HOURS.minAdvance} minutes from now.`;
    }
    
    const selectedHour = selectedDate.getHours();
    if (selectedHour < STORE_HOURS.open || selectedHour >= STORE_HOURS.close) {
      return `Store hours are ${STORE_HOURS.open}:00 AM - ${STORE_HOURS.close}:00 PM.`;
    }
    
    return '';
  }, []);

  // Handle scheduled datetime changes
  const handleScheduledDateTimeChange = useCallback((dateTime: string) => {
    setScheduledDeliveryDateTime(dateTime);
    const error = validateScheduledDateTime(dateTime);
    setValidationError(error);
  }, [validateScheduledDateTime]);

  // Refresh customer data from database when component mounts or phone changes
  useEffect(() => {
    const refreshCustomerData = async () => {
      if (!phone) {
        navigate('/customer-lookup');
        return;
      }

      try {
        // Fetch fresh customer data from database
        const freshCustomer = await findCustomerByPhone(phone);
        if (freshCustomer) {
          setCustomer(freshCustomer);
          
          // Update delivery address with fresh data
          if (freshCustomer.address) {
            setDeliveryAddress(freshCustomer.address);
            setFullAddress(`${freshCustomer.address.street}, ${freshCustomer.address.city}, ${freshCustomer.address.postalCode}`);
            
            // Set cached distance if available for this store
            if (freshCustomer.distanceFromStore && freshCustomer.storeId === currentStore?.id) {
              setDistance(freshCustomer.distanceFromStore);
              setIsCachedDistance(true);
            } else {
              setDistance(null);
              setIsCachedDistance(false);
            }
          }
        } else {
          // Customer not found, redirect to customer lookup
          navigate('/customer-lookup');
        }
      } catch (error) {
        setErrorDialog({
          isOpen: true,
          title: 'Error Loading Customer',
          message: 'Failed to load customer information. Please try again.'
        });
        // If refresh fails, use the initial customer data
        if (initialCustomer) {
          setCustomer(initialCustomer);
          if (initialCustomer.address) {
            setDeliveryAddress(initialCustomer.address);
            setFullAddress(`${initialCustomer.address.street}, ${initialCustomer.address.city}, ${initialCustomer.address.postalCode}`);
            
            if (initialCustomer.distanceFromStore && initialCustomer.storeId === currentStore?.id) {
              setDistance(initialCustomer.distanceFromStore);
              setIsCachedDistance(true);
            }
          }
        }
      }
    };

    refreshCustomerData();
  }, [phone, navigate, currentStore, initialCustomer]);

  // Handle incoming state from navigation (e.g., when coming back from menu)
  useEffect(() => {
    if (incomingDistance !== undefined) {
      setDistance(incomingDistance);
    }
    
    if (incomingDeliveryAddress) {
      setDeliveryAddress(incomingDeliveryAddress);
      setFullAddress(`${incomingDeliveryAddress.street}, ${incomingDeliveryAddress.city}, ${incomingDeliveryAddress.postalCode}`);
    }
  }, [incomingDistance, incomingDeliveryAddress, incomingOrderType]);
  
  // Memoized handlers
  const handleAddressSelect = useCallback(async (address: {
    street: string;
    city: string;
    postalCode: string;
    fullAddress: string;
    lat?: number;
    lon?: number;
  }) => {
    const updatedAddress = {
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      lat: address.lat,
      lon: address.lon
    };
    
    setDeliveryAddress(updatedAddress);
    setFullAddress(address.fullAddress);
    setIsCachedDistance(false);
    
    // Calculate new distance if we have coordinates for both store and customer address
    if (currentStore && address.lat && address.lon) {
      const storeLat = currentStore.latitude;
      const storeLon = currentStore.longitude;
      
      if (storeLat && storeLon) {
        setIsLoadingDistance(true);
        try {
          const distanceKm = await calculateDrivingDistance(
            storeLat,
            storeLon,
            address.lat,
            address.lon
          );
          setDistance(distanceKm);
        } catch (error) {
          console.error('Error calculating distance:', error);
          setDistance(null);
        } finally {
          setIsLoadingDistance(false);
        }
      } else {
        setDistance(null);
        setIsLoadingDistance(false);
      }
    } else {
      setDistance(null);
      setIsLoadingDistance(false);
    }
  }, [currentStore]);

  const handleAddressChange = useCallback((value: string) => {
    setFullAddress(value);
  }, []);

  const handleNavigateToCustomerLookup = useCallback(() => {
    navigate('/customer-lookup');
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate('/order', { state: { customer, phone } });
  }, [navigate, customer, phone]);

  const handleConfirmDelivery = useCallback(async () => {
    // Validate scheduled delivery time if selected
    if (deliveryTimeType === 'scheduled') {
      const error = validateScheduledDateTime(scheduledDeliveryDateTime);
      if (error) {
        setValidationError(error);
        setErrorDialog({
          isOpen: true,
          title: 'Invalid Delivery Time',
          message: error
        });
        return;
      }
    }

    // Check delivery distance
    if (distance !== null && distance > MAX_DELIVERY_DISTANCE) {
      setErrorDialog({
        isOpen: true,
        title: 'Address Outside Delivery Range',
        message: `This address is ${distance.toFixed(1)} km away, which is outside our delivery range of ${MAX_DELIVERY_DISTANCE} km. Please choose a closer address or select pickup instead.`
      });
      return;
    }

    try {
      // Update customer address in database if it has changed
      if (phone && (
        deliveryAddress.street !== customer?.address?.street ||
        deliveryAddress.city !== customer?.address?.city ||
        deliveryAddress.postalCode !== customer?.address?.postalCode ||
        deliveryAddress.lat !== customer?.address?.lat ||
        deliveryAddress.lon !== customer?.address?.lon
      )) {
        await updateCustomerAddress(phone, deliveryAddress, distance || undefined);
      }

      // Update the customer object with the new address for immediate use
      const updatedCustomer = {
        ...customer,
        address: deliveryAddress,
        distanceFromStore: distance
      };

      navigate('/menu', { 
        state: { 
          customer: updatedCustomer, 
          phone, 
          orderType: 'delivery', 
          deliveryAddress,
          deliveryTimeType,
          scheduledDeliveryDateTime,
          distance,
          // Preserve cart items if they exist
          ...(cartItems && { cartItems })
        } 
      });
    } catch (error) {
      setErrorDialog({
        isOpen: true,
        title: 'Error Updating Address',
        message: 'Failed to update customer address. Please try again.'
      });
    }
  }, [navigate, customer, phone, deliveryAddress, deliveryTimeType, scheduledDeliveryDateTime, distance, validateScheduledDateTime]);

  // Memoized derived state
  const isDetailsComplete = useMemo(() => 
    Boolean(deliveryAddress.street && deliveryAddress.city && deliveryAddress.postalCode) &&
    (deliveryTimeType === 'asap' || (deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime !== '' && !validationError)) &&
    (distance === null || distance <= MAX_DELIVERY_DISTANCE),
    [deliveryAddress.street, deliveryAddress.city, deliveryAddress.postalCode, deliveryTimeType, scheduledDeliveryDateTime, validationError, distance]
  );

  if (!customer) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-orange-50">
      <TopBar 
        cartItemsCount={0}
        cartTotal={0}
        customerInfo={customer}
        orderType="Delivery"
        currentStep="details"
        onQuickAddClick={() => {}}
      />
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 pt-4 lg:pt-6">
        <div className="w-full max-w-7xl mx-auto space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-800 to-red-900 rounded-2xl shadow-lg">
                <Truck className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent">
                Delivery Details
              </h1>
            </div>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-4">
              For <span className="font-bold text-gray-900">{customer.name}</span> ({phone})
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

            {/* Delivery Address Form */}
            <div className="lg:col-span-2">
              <AddressForm
                onAddressSelect={handleAddressSelect}
                onAddressChange={handleAddressChange}
                fullAddress={fullAddress}
                distance={distance}
                isLoadingDistance={isLoadingDistance}
                isCachedDistance={isCachedDistance}
                isComplete={isDetailsComplete}
                deliveryTimeType={deliveryTimeType}
                setDeliveryTimeType={setDeliveryTimeType}
                scheduledDeliveryDateTime={scheduledDeliveryDateTime}
                setScheduledDeliveryDateTime={handleScheduledDateTimeChange}
                validationError={validationError}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
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
              onClick={handleConfirmDelivery}
              aria-label="Confirm delivery order and proceed to menu"
            >
              <span className="font-bold">Confirm Delivery Order</span>
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

export default memo(DeliveryDetailsPage);