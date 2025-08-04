import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Home, ArrowRight, CheckCircle, MapPin } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { useStore } from '../context/StoreContext';
import { createOrUpdateCustomer, findCustomerByPhone } from '../services/customerService';
import AddressAutocomplete from '../components/AddressAutocomplete';

// Simple function to validate phone number
const isValidPhoneNumber = (phone: string): boolean => {
  return phone.replace(/\D/g, '').length === 10;
};

// Calculate driving distance between two coordinates using Geoapify Routing API
const calculateDrivingDistance = async (lat1: number, lon1: number, lat2: number, lon2: number): Promise<number | null> => {
  try {
    const API_KEY = "34fdfa74334e4230b1153e219ddf8dcd";
    const waypoints = `${lat1},${lon1}|${lat2},${lon2}`;
    const params = new URLSearchParams({
      waypoints: waypoints,
      mode: 'drive',
      apiKey: API_KEY
    });

    const response = await fetch(`https://api.geoapify.com/v1/routing?${params}`);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const distance = feature.properties.distance; // Distance in meters
      const distanceKm = distance / 1000; // Convert to kilometers
      return distanceKm;
    }
    return null;
  } catch (error) {
    console.error('Error calculating driving distance:', error);
    return null;
  }
};

interface CustomerFormInfo {
  fullName: string;
  phone: string;
}

interface DeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
  lat?: number;
  lon?: number;
}

export default function CustomerInfoPage() {
  const navigate = useNavigate();
  const { customerInfo, updateCustomerInfo } = useCustomer();
  const { selectedStore } = useStore();
  

  const [formInfo, setFormInfo] = useState<CustomerFormInfo>({
    fullName: customerInfo?.fullName || '',
    phone: customerInfo?.phone || ''
  });
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    street: customerInfo?.deliveryAddress?.street || '',
    city: customerInfo?.deliveryAddress?.city || '',
    postalCode: customerInfo?.deliveryAddress?.postalCode || '',
    lat: customerInfo?.deliveryAddress?.lat,
    lon: customerInfo?.deliveryAddress?.lon
  });
  const [fullAddress, setFullAddress] = useState(
    customerInfo?.deliveryAddress ? 
    `${customerInfo.deliveryAddress.street}, ${customerInfo.deliveryAddress.city}, ${customerInfo.deliveryAddress.postalCode}` : 
    ''
  );
  const [distance, setDistance] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [isCachedDistance, setIsCachedDistance] = useState(false);
  const [isAddressAutoPopulated, setIsAddressAutoPopulated] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Update form when customerInfo changes (e.g., on page refresh)
  useEffect(() => {
    if (customerInfo) {
      setFormInfo({
        fullName: customerInfo.fullName || '',
        phone: customerInfo.phone || ''
      });
      if (customerInfo.deliveryAddress) {
        setDeliveryAddress({
          street: customerInfo.deliveryAddress.street || '',
          city: customerInfo.deliveryAddress.city || '',
          postalCode: customerInfo.deliveryAddress.postalCode || '',
          lat: customerInfo.deliveryAddress.lat,
          lon: customerInfo.deliveryAddress.lon
        });
        setFullAddress(`${customerInfo.deliveryAddress.street}, ${customerInfo.deliveryAddress.city}, ${customerInfo.deliveryAddress.postalCode}`);
      }
    }
  }, [customerInfo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormInfo(prev => {
      const updated = { ...prev, [id]: value };
      // Update customer info in real-time
      updateCustomerInfo(updated);
      return updated;
    });
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    
    setFormInfo(prev => {
      const updated = { ...prev, phone: formattedPhone };
      // Update customer info in real-time
      updateCustomerInfo(updated);
      return updated;
    });

    // Check for existing customer when phone number is complete (10 digits without formatting)
    const cleanPhone = formattedPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      try {
        const existingCustomer = await findCustomerByPhone(cleanPhone);
        
        if (existingCustomer && existingCustomer.address && customerInfo?.orderType === 'delivery') {
          
          // Auto-populate address fields
          setDeliveryAddress({
            street: existingCustomer.address.street || '',
            city: existingCustomer.address.city || '',
            postalCode: existingCustomer.address.postalCode || '',
            lat: existingCustomer.address.lat,
            lon: existingCustomer.address.lon
          });
          
          // Set full address for display
          const fullAddr = `${existingCustomer.address.street}, ${existingCustomer.address.city}, ${existingCustomer.address.postalCode}`;
          setFullAddress(fullAddr);
          setIsAddressAutoPopulated(true);
          setShowWelcomeBack(true);
          
          // Set cached distance if available for this store
          if (existingCustomer.distanceFromStore && existingCustomer.storeId === selectedStore?.id) {
            setDistance(existingCustomer.distanceFromStore);
            setIsCachedDistance(true);
          }
          
          // Update customer info with existing data (but preserve current phone number)
          const updatedCustomerInfo = {
            ...formInfo,
            phone: formattedPhone, // Preserve the current phone number
            customerId: existingCustomer.id,
            deliveryAddress: existingCustomer.address
          };
          
          // Update form state to ensure phone number is preserved
          setFormInfo(prev => ({
            ...prev,
            phone: formattedPhone
          }));
          
          updateCustomerInfo(updatedCustomerInfo);
        }
      } catch (error) {
        // Silent error handling
      }
    }
  };

  // Check for existing customer distance
  const checkExistingCustomerDistance = async (phone: string) => {
    try {
      const customer = await findCustomerByPhone(phone);
      if (customer && customer.distanceFromStore && customer.storeId === selectedStore?.id) {
        setDistance(customer.distanceFromStore);
        setIsCachedDistance(true);
        return true;
      }
    } catch (error) {
      // Silent error handling
    }
    return false;
  };

  const handleAddressSelect = async (address: {
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
    setIsAddressAutoPopulated(false);
    setShowWelcomeBack(false);
    
    // Always calculate new distance when address is selected (don't use cached distance for new address)
    if (selectedStore && address.lat && address.lon) {
      let storeLat = selectedStore.latitude;
      let storeLon = selectedStore.longitude;
      
      if (storeLat && storeLon) {
        setIsLoadingDistance(true);
        setIsCachedDistance(false);
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
    
    // Update customer info in real-time
    updateCustomerInfo({
      ...formInfo,
      deliveryAddress: updatedAddress
    });
  };

  const handleAddressChange = (value: string) => {
    setFullAddress(value);
    // If user starts typing a different address, reset auto-populated state
    if (isAddressAutoPopulated && value !== fullAddress) {
      setIsAddressAutoPopulated(false);
      setDistance(null);
      setIsCachedDistance(false);
      setShowWelcomeBack(false);
    }
  };

  const isInfoComplete = Boolean(
    formInfo.fullName && 
    isValidPhoneNumber(formInfo.phone)
  );

  const isDeliveryAddressComplete = customerInfo?.orderType === 'delivery' ? 
    Boolean(deliveryAddress.street && deliveryAddress.city && deliveryAddress.postalCode) : true;

  const handleContinue = async () => {
    if (isInfoComplete && isDeliveryAddressComplete && selectedStore) {
      setIsSaving(true);
      
      try {
        // Prepare customer data
        const customerData = {
          phone: formInfo.phone,
          name: formInfo.fullName,
          storeId: selectedStore.id,
          ...(customerInfo?.orderType === 'delivery' ? { address: deliveryAddress } : {}),
          ...(distance !== null && !isNaN(distance) ? { distanceFromStore: distance } : {})
        };
        
        // Save customer to database
        const savedCustomer = await createOrUpdateCustomer(customerData);
        
        // Update customer info in context
        const finalInfo = {
          ...formInfo,
          customerId: savedCustomer.id,
          ...(customerInfo?.orderType === 'delivery' ? { deliveryAddress } : {})
        };
        updateCustomerInfo(finalInfo);
        
        navigate('/menu');
      } catch (error) {
        console.error('❌ Error saving customer:', error);
        // Still continue to menu even if saving fails
        const finalInfo = {
          ...formInfo,
          ...(customerInfo?.orderType === 'delivery' ? { deliveryAddress } : {})
        };
        updateCustomerInfo(finalInfo);
        navigate('/menu');
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Full Name
            </label>
            <input 
              id="fullName" 
              type="text"
              placeholder="John Smith" 
              value={formInfo.fullName} 
              onChange={handleInputChange}
              className="w-full text-sm py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-300 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone Number
            </label>
            <input 
              id="phone" 
              type="tel"
              placeholder="123-456-7890" 
              value={formInfo.phone} 
              onChange={handlePhoneChange}
              maxLength={12}
              className="w-full text-sm py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-300 focus:border-transparent"
            />
          </div>

          {customerInfo?.orderType === 'delivery' && (
            <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
               <Home className="h-3.5 w-3.5" />
               Delivery Address
               {isAddressAutoPopulated && (
                 <span className="text-xs text-green-600 ml-1">(saved)</span>
               )}
             </label>
              <AddressAutocomplete
                value={fullAddress}
                onChange={handleAddressChange}
                onAddressSelect={handleAddressSelect}
                placeholder="Enter your delivery address"
                className="w-full"
              />
                             <p className="mt-1 text-xs text-gray-500">
                 {isAddressAutoPopulated ? 
                   "Address loaded from your previous order. Type to change address." :
                   "Start typing to see address suggestions (Ontario, Canada only, 7+ characters)"
                 }
               </p>
            </div>
          )}
                 </div>

         {/* Welcome Back Message */}
         {showWelcomeBack && (
           <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
             <p className="text-xs text-green-800 text-center">
               Welcome back! Your address and distance have been loaded from your previous order.
             </p>
           </div>
         )}

         {/* Store Address Preview */}
        {selectedStore && (
          <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-1 flex items-center gap-1.5 text-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              Store Information
            </h3>
            <p className="text-blue-700 text-sm">
              <strong>{selectedStore.name}</strong><br />
              {selectedStore.address}<br />
              Phone: {selectedStore.phone}
            </p>
                         {isLoadingDistance && (
               <div className="mt-2 pt-2 border-t border-blue-200">
                 <p className="text-blue-700 text-sm flex items-center gap-1">
                   <MapPin className="h-3 w-3" />
                   Calculating distance...
                 </p>
               </div>
             )}
             {distance !== null && !isNaN(distance) && !isLoadingDistance && (
               <div className="mt-2 pt-2 border-t border-blue-200">
                 <p className="text-blue-700 text-sm flex items-center gap-1">
                   <MapPin className="h-3 w-3" />
                   Distance: {distance.toFixed(1)} km
                   {isCachedDistance && (
                     <span className="text-xs text-green-600 ml-1">(cached)</span>
                   )}
                 </p>
               </div>
             )}
            {distance !== null && isNaN(distance) && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-blue-700 text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Distance: Unable to calculate
                </p>
              </div>
            )}
          </div>
        )}

        {!isInfoComplete && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 text-center">
              Please provide your full name and a valid phone number to continue.
            </p>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!isInfoComplete || !isDeliveryAddressComplete || isSaving}
          className="px-6 py-2 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 text-white rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 text-sm"
        >
          {isSaving ? 'Saving...' : 'Continue to Menu'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 