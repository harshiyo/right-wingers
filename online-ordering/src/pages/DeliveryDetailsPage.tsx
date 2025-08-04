import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, Home, ArrowRight, CheckCircle } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface DeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
}

export default function DeliveryDetailsPage() {
  const navigate = useNavigate();
  const { customerInfo, updateCustomerInfo } = useCustomer();
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    street: customerInfo?.deliveryAddress?.street || '',
    city: customerInfo?.deliveryAddress?.city || '',
    postalCode: customerInfo?.deliveryAddress?.postalCode || ''
  });
  const [fullAddress, setFullAddress] = useState(
    customerInfo?.deliveryAddress ? 
    `${customerInfo.deliveryAddress.street}, ${customerInfo.deliveryAddress.city}, ${customerInfo.deliveryAddress.postalCode}` : 
    ''
  );

  const handleAddressSelect = (address: {
    street: string;
    city: string;
    postalCode: string;
    fullAddress: string;
  }) => {
    const updatedAddress = {
      street: address.street,
      city: address.city,
      postalCode: address.postalCode
    };
    
    setDeliveryAddress(updatedAddress);
    setFullAddress(address.fullAddress);
    
    // Update customer info in real-time
    updateCustomerInfo({
      orderType: 'delivery',
      deliveryAddress: updatedAddress
    });
  };

  const handleAddressChange = (value: string) => {
    setFullAddress(value);
  };

  const isAddressComplete = Boolean(
    deliveryAddress.street && 
    deliveryAddress.city && 
    deliveryAddress.postalCode
  );

  const handleContinue = () => {
    if (isAddressComplete) {
      updateCustomerInfo({
        orderType: 'delivery',
        deliveryAddress
      });
      navigate('/customer-info');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              Delivery Address
            </label>
            <AddressAutocomplete
              value={fullAddress}
              onChange={handleAddressChange}
              onAddressSelect={handleAddressSelect}
              placeholder="Enter your delivery address"
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Start typing to see address suggestions (Ontario, Canada only)
            </p>
          </div>
        </div>

        {/* Address Preview */}
        {isAddressComplete && (
          <div className="mt-4 bg-green-50 rounded-lg p-3 border border-green-200">
            <h3 className="font-medium text-green-800 mb-1 flex items-center gap-1.5 text-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              Delivery Address Preview
            </h3>
            <p className="text-green-700 text-sm">
              {deliveryAddress.street}<br />
              {deliveryAddress.city}, {deliveryAddress.postalCode}
            </p>
          </div>
        )}

        {/* Delivery Info */}
        <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h3 className="font-medium text-blue-800 mb-1 text-sm">Delivery Information</h3>
          <ul className="text-xs text-blue-700 space-y-0.5">
            <li>• Estimated delivery time: 30-45 minutes</li>
            <li>• Delivery fee: $3.99 (free for orders over $30)</li>
            <li>• We'll call when we arrive</li>
          </ul>
        </div>

        {!isAddressComplete && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 text-center">
              Please select a complete address from the suggestions to continue.
            </p>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!isAddressComplete}
          className="px-6 py-2 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 text-white rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 text-sm"
        >
          <span className="font-bold">Continue to Menu</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 