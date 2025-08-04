import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TopBar } from '../components/layout/TopBar';
import { Truck, MapPin, Home, ArrowRight, CheckCircle, User, Clock, Calendar } from 'lucide-react';
import { Customer, updateCustomerAddress, calculateDrivingDistance, findCustomerByPhone } from '../data/customers';
import { useStore } from '../context/StoreContext';
import AddressAutocomplete from '../components/AddressAutocomplete';

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
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-6">
      <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
        <User className="h-5 w-5 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
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
          <div className="p-2 bg-teal-50 rounded-lg">
            <p className="text-teal-600 font-medium">Order Type</p>
            <p className="font-semibold text-gray-900 text-sm">Delivery</p>
          </div>
        </div>
      </div>
    </div>
  </div>
));

CustomerInfoCard.displayName = 'CustomerInfoCard';

// Memoized address form component
const AddressForm = memo(({ 
  deliveryAddress, 
  onChange, 
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
  setScheduledDeliveryDateTime
}: {
  deliveryAddress: { street: string; city: string; postalCode: string; lat?: number; lon?: number };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-6">
      <div className="p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
        <MapPin className="h-5 w-5 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Where should we deliver this order?</h2>
    </div>
    
    <div className="flex-1 flex flex-col">
      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="street" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Home className="h-4 w-4" />
              Delivery Address
            </label>
            <AddressAutocomplete
              value={fullAddress}
              onChange={onAddressChange}
              onAddressSelect={onAddressSelect}
              placeholder="Enter your delivery address"
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Start typing to see address suggestions (Ontario, Canada only, 7+ characters)
            </p>
          </div>
        </div>

                 {/* Distance Information */}
         {isLoadingDistance && (
           <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
             <p className="text-blue-700 text-sm flex items-center gap-1">
               <MapPin className="h-3 w-3" />
               Calculating distance...
             </p>
           </div>
         )}
         {distance !== null && !isNaN(distance) && !isLoadingDistance && (
           <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
             <p className="text-blue-700 text-sm flex items-center gap-1">
               <MapPin className="h-3 w-3" />
               Distance: {distance.toFixed(1)} km
               {isCachedDistance && (
                 <span className="text-xs text-green-600 ml-1">(cached)</span>
               )}
             </p>
           </div>
         )}

         {/* Delivery Time Selection */}
         <div className="space-y-3">
           <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
             <Clock className="h-4 w-4" />
             When should we deliver?
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <button
               className={`group relative rounded-lg border-2 p-4 transition-colors duration-200 focus:outline-none text-center h-full ${deliveryTimeType === 'asap' ? 'border-orange-600 bg-orange-50 shadow-lg' : 'border-gray-200 hover:border-orange-300 hover:shadow-md'}`}
               onClick={() => setDeliveryTimeType('asap')}
             >
               <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 bg-gradient-to-br from-orange-600 to-orange-700">
                 <Clock className="h-5 w-5 text-white" />
               </div>
               <h4 className="text-base font-bold text-gray-900 mb-1">ASAP</h4>
               <p className="text-gray-600 text-xs">Delivered in 30-45 minutes</p>
               {deliveryTimeType === 'asap' && (
                 <div className="mt-2 flex items-center justify-center gap-1 text-orange-600">
                   <CheckCircle className="h-3 w-3" />
                   <span className="font-semibold text-xs">Selected!</span>
                 </div>
               )}
             </button>
             <button
               className={`group relative rounded-lg border-2 p-4 transition-colors duration-200 focus:outline-none text-center h-full ${deliveryTimeType === 'scheduled' ? 'border-orange-600 bg-orange-50 shadow-lg' : 'border-gray-200 hover:border-orange-300 hover:shadow-md'}`}
               onClick={() => setDeliveryTimeType('scheduled')}
             >
               <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 bg-gradient-to-br from-orange-600 to-orange-700">
                 <Calendar className="h-5 w-5 text-white" />
               </div>
               <h4 className="text-base font-bold text-gray-900 mb-1">Schedule for Later</h4>
               <p className="text-gray-600 text-xs">Choose specific date and time</p>
               {deliveryTimeType === 'scheduled' && (
                 <div className="mt-2 flex items-center justify-center gap-1 text-orange-600">
                   <CheckCircle className="h-3 w-3" />
                   <span className="font-semibold text-xs">Selected!</span>
                 </div>
               )}
             </button>
           </div>
           {deliveryTimeType === 'scheduled' && (
             <div className="mt-3 bg-orange-50 rounded-lg p-3 border border-orange-200">
               <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2 text-xs">
                 <Calendar className="h-3 w-3" />
                 Schedule Delivery Time
               </h4>
               <Input
                 type="datetime-local"
                 value={scheduledDeliveryDateTime}
                 onChange={e => setScheduledDeliveryDateTime(e.target.value)}
                 min={new Date(Date.now() + 45 * 60 * 1000).toISOString().slice(0, 16)}
                 className="w-full text-sm"
               />
               <p className="text-xs text-orange-600 mt-1">
                 Minimum 45 minutes from now. Store hours: 11:00 AM - 10:00 PM
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
      </div>
    </div>
  </div>
));

AddressForm.displayName = 'AddressForm';

const DeliveryDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStore } = useStore();
  
  const { customer: initialCustomer, phone } = location.state || {};

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
  const [distance, setDistance] = useState<number | null>(null);
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [isCachedDistance, setIsCachedDistance] = useState(false);
  const [deliveryTimeType, setDeliveryTimeType] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledDeliveryDateTime, setScheduledDeliveryDateTime] = useState('');

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
        console.error('Error refreshing customer data:', error);
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
        const distanceKm = await calculateDrivingDistance(
          storeLat,
          storeLon,
          address.lat,
          address.lon
        );
        setDistance(distanceKm);
        setIsLoadingDistance(false);
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

  const handleDeliveryAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setDeliveryAddress(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleNavigateToCustomerLookup = useCallback(() => {
    navigate('/customer-lookup');
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate('/order', { state: { customer, phone } });
  }, [navigate, customer, phone]);

  const handleConfirmDelivery = useCallback(async () => {
    try {
      // Update customer address in database if it has changed
      if (phone && (
        deliveryAddress.street !== customer?.address?.street ||
        deliveryAddress.city !== customer?.address?.city ||
        deliveryAddress.postalCode !== customer?.address?.postalCode ||
        deliveryAddress.lat !== customer?.address?.lat ||
        deliveryAddress.lon !== customer?.address?.lon
      )) {
        console.log('Updating customer address in database...');
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
          distance
        } 
      });
    } catch (error) {
      console.error('Error updating customer address:', error);
      // Continue with navigation even if address update fails
      navigate('/menu', { 
        state: { 
          customer: {
            ...customer,
            address: deliveryAddress,
            distanceFromStore: distance
          }, 
          phone, 
          orderType: 'delivery', 
          deliveryAddress,
          deliveryTimeType,
          scheduledDeliveryDateTime,
          distance
        } 
      });
    }
  }, [navigate, customer, phone, deliveryAddress, deliveryTimeType, scheduledDeliveryDateTime, distance]);

  // Memoized derived state
  const isDetailsComplete = useMemo(() => 
    Boolean(deliveryAddress.street && deliveryAddress.city && deliveryAddress.postalCode),
    [deliveryAddress.street, deliveryAddress.city, deliveryAddress.postalCode]
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
      <div className="flex-1 overflow-y-auto p-4 pt-6">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-800 to-red-900 rounded-2xl shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent">
                Delivery Details
              </h1>
            </div>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              For <span className="font-bold text-gray-900">{customer.name}</span> ({phone})
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
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
                 deliveryAddress={deliveryAddress}
                 onChange={handleDeliveryAddressChange}
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
                 setScheduledDeliveryDateTime={setScheduledDeliveryDateTime}
               />
            </div>
          </div>

          

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
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
              onClick={handleConfirmDelivery}
            >
              <span className="font-bold">Confirm Delivery Order</span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(DeliveryDetailsPage);