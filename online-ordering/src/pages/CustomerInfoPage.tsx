import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import { useStore } from '../context/StoreContext';
import { createOrUpdateCustomer } from '../services/customerService';
import { ArrowLeft, User, Phone, MapPin, Calendar, Clock, Home, CheckCircle, ArrowRight } from 'lucide-react';

// Simple function to validate phone number
const isValidPhoneNumber = (phone: string): boolean => {
  return phone.replace(/\D/g, '').length === 10;
};

interface CustomerFormInfo {
  fullName: string;
  phone: string;
}

interface DeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
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
    postalCode: customerInfo?.deliveryAddress?.postalCode || ''
  });
  const [isSaving, setIsSaving] = useState(false);

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
          postalCode: customerInfo.deliveryAddress.postalCode || ''
        });
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setFormInfo(prev => {
      const updated = { ...prev, phone: formattedPhone };
      // Update customer info in real-time
      updateCustomerInfo(updated);
      return updated;
    });
  };

  const isInfoComplete = Boolean(
    formInfo.fullName && 
    isValidPhoneNumber(formInfo.phone)
  );

  const isDeliveryAddressComplete = customerInfo?.orderType === 'delivery' ? Boolean(
    deliveryAddress.street && 
    deliveryAddress.city && 
    deliveryAddress.postalCode
  ) : true;

  const handleContinue = async () => {
    if (isInfoComplete && isDeliveryAddressComplete && selectedStore) {
      setIsSaving(true);
      
      try {
        // Prepare customer data
        const customerData = {
          phone: formInfo.phone,
          name: formInfo.fullName,
          storeId: selectedStore.id,
          ...(customerInfo?.orderType === 'delivery' ? { address: deliveryAddress } : {})
        };
        
        // Save customer to database
        const savedCustomer = await createOrUpdateCustomer(customerData);
        console.log('✅ Customer saved/updated:', savedCustomer.id);
        
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
            <>
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5" />
                  Street Address
                </label>
                <input 
                  id="street" 
                  type="text"
                  placeholder="123 Main St" 
                  value={deliveryAddress.street} 
                  onChange={handleAddressChange}
                  className="w-full text-sm py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-300 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  City
                </label>
                <input 
                  id="city" 
                  type="text"
                  placeholder="New York" 
                  value={deliveryAddress.city} 
                  onChange={handleAddressChange}
                  className="w-full text-sm py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-300 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Postal Code
                </label>
                <input 
                  id="postalCode" 
                  type="text"
                  placeholder="10001" 
                  value={deliveryAddress.postalCode} 
                  onChange={handleAddressChange}
                  className="w-full text-sm py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-300 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>

        {/* Info Preview */}
        {isInfoComplete && (
          <div className="mt-4 bg-green-50 rounded-lg p-3 border border-green-200">
            <h3 className="font-medium text-green-800 mb-1 flex items-center gap-1.5 text-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              Contact Information Preview
            </h3>
            <p className="text-green-700 text-sm">
              {formInfo.fullName}<br />
              {formInfo.phone}
            </p>
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