import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Home, ArrowRight, CheckCircle, MapPin, Store as StoreIcon } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-br from-red-200 to-orange-200 rounded-full opacity-30 blur-2xl"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-br from-orange-200 to-yellow-200 rounded-full opacity-40 blur-2xl"></div>
        <div className="absolute bottom-40 left-20 w-36 h-36 bg-gradient-to-br from-yellow-200 to-red-100 rounded-full opacity-35 blur-2xl"></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-gradient-to-br from-red-100 to-pink-100 rounded-full opacity-45 blur-2xl"></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3 drop-shadow-sm">Customer Information</h2>
          <p className="text-lg text-gray-600">Please provide your details to continue</p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-xl border border-white/60">
          <div className="grid grid-cols-1 gap-6">
            {/* Full Name Input */}
            <div>
              <label htmlFor="fullName" className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                Full Name
              </label>
              <input 
                id="fullName" 
                type="text"
                placeholder="Enter your full name" 
                value={formInfo.fullName} 
                onChange={handleInputChange}
                className="w-full text-base py-4 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
              />
            </div>
            
            {/* Phone Number Input */}
            <div>
              <label htmlFor="phone" className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
                  <Phone className="h-4 w-4 text-white" />
                </div>
                Phone Number
              </label>
              <input 
                id="phone" 
                type="tel"
                placeholder="123-456-7890" 
                value={formInfo.phone} 
                onChange={handlePhoneChange}
                maxLength={12}
                className="w-full text-base py-4 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
              />
            </div>

            {/* Delivery Address Section */}
            {customerInfo?.orderType === 'delivery' && (
              <div className="relative">
                <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                    <Home className="h-4 w-4 text-white" />
                  </div>
                  Delivery Address
                  {isAddressAutoPopulated && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2">Saved</span>
                  )}
                </label>
                <div className="relative z-10">
                  <AddressAutocomplete
                    value={fullAddress}
                    onChange={handleAddressChange}
                    onAddressSelect={handleAddressSelect}
                    placeholder="Enter your delivery address"
                    className="w-full"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {isAddressAutoPopulated ? 
                    "Address loaded from your previous order. Type to change address." :
                    "Start typing your address to see suggestions"
                  }
                </p>
              </div>
            )}
          </div>

          {/* Welcome Back Message */}
          {showWelcomeBack && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800">
                  Welcome back! Your address and distance have been loaded from your previous order.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Store Information Card */}
        {selectedStore && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-xl border border-white/60 relative z-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <StoreIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Store Information</h3>
                <p className="text-sm text-gray-600">{selectedStore.name}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{selectedStore.address}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{selectedStore.phone}</span>
              </div>
            </div>
          </div>
        )}

        {/* Validation Message */}
        {!isInfoComplete && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-yellow-800">
                Please provide your full name and a valid phone number to continue.
              </p>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="relative">
          <button
            onClick={handleContinue}
            disabled={!isInfoComplete || !isDeliveryAddressComplete || isSaving}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-5 px-6 rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3 text-lg relative overflow-hidden group"
          >
            {/* Button glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            
            <span>{isSaving ? 'Saving...' : 'Continue to Menu'}</span>
            <ArrowRight className="w-6 h-6" />
          </button>
          {/* Button shadow */}
          <div className="absolute inset-0 bg-red-900/20 rounded-2xl blur-lg -z-10"></div>
        </div>
      </div>
    </div>
  );
} 