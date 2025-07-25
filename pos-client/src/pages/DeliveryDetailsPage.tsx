import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TopBar } from '../components/layout/TopBar';
import { Truck, MapPin, Home, ArrowRight, CheckCircle, User, Clock, Calendar } from 'lucide-react';
import { Customer } from '../data/customers';

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
  isComplete 
}: {
  deliveryAddress: { street: string; city: string; postalCode: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isComplete: boolean;
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
              Street Address
            </label>
            <Input 
              id="street" 
              placeholder="123 Main Street, Apt 4B" 
              value={deliveryAddress.street} 
              onChange={onChange}
              className="w-full text-base py-3"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="city" className="block text-sm font-bold text-gray-700 mb-2">
                City
              </label>
              <Input 
                id="city" 
                placeholder="Oakville" 
                value={deliveryAddress.city} 
                onChange={onChange}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-sm font-bold text-gray-700 mb-2">
                Postal Code
              </label>
              <Input 
                id="postalCode" 
                placeholder="L6H 1A1" 
                value={deliveryAddress.postalCode} 
                onChange={onChange}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Address Preview */}
        {(deliveryAddress.street || deliveryAddress.city || deliveryAddress.postalCode) && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4" />
              Delivery Address Preview
            </h3>
            <p className="text-green-700 text-sm">
              {deliveryAddress.street && <span>{deliveryAddress.street}<br /></span>}
              {deliveryAddress.city && <span>{deliveryAddress.city}, </span>}
              {deliveryAddress.postalCode && <span>{deliveryAddress.postalCode}</span>}
            </p>
          </div>
        )}

        {/* Delivery Info */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-2 text-sm">Delivery Information</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Estimated delivery time: 30-45 minutes</li>
            <li>• Delivery fee: $3.99 (free for orders over $30)</li>
            <li>• We'll call when we arrive</li>
          </ul>
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
  
  const { customer, phone } = location.state || {};

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '', city: '', postalCode: '',
  });
  const [deliveryTimeType, setDeliveryTimeType] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledDeliveryDateTime, setScheduledDeliveryDateTime] = useState('');

  useEffect(() => {
    if (!customer || !phone) {
      navigate('/customer-lookup');
      return;
    }
    if (customer.address) {
      setDeliveryAddress(customer.address);
    }
  }, [customer, phone, navigate]);
  
  // Memoized handlers
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

  const handleConfirmDelivery = useCallback(() => {
    navigate('/menu', { 
      state: { 
        customer, 
        phone, 
        orderType: 'delivery', 
        deliveryAddress,
        deliveryTimeType,
        scheduledDeliveryDateTime
      } 
    });
  }, [navigate, customer, phone, deliveryAddress, deliveryTimeType, scheduledDeliveryDateTime]);

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
                isComplete={isDetailsComplete}
              />
            </div>
          </div>

          {/* Delivery Time Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">When should we deliver?</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <button
                  className={`group relative rounded-lg border-2 p-4 transition-colors duration-200 focus:outline-none text-center h-full ${deliveryTimeType === 'asap' ? 'border-orange-600 bg-orange-50 shadow-lg' : 'border-gray-200 hover:border-orange-300 hover:shadow-md'}`}
                  onClick={() => setDeliveryTimeType('asap')}
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 bg-gradient-to-br from-orange-600 to-orange-700">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">ASAP</h3>
                  <p className="text-gray-600 mb-2 text-sm">Delivered in 30-45 minutes</p>
                  {deliveryTimeType === 'asap' && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-orange-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-semibold text-sm">Selected!</span>
                    </div>
                  )}
                </button>
                <button
                  className={`group relative rounded-lg border-2 p-4 transition-colors duration-200 focus:outline-none text-center h-full ${deliveryTimeType === 'scheduled' ? 'border-orange-600 bg-orange-50 shadow-lg' : 'border-gray-200 hover:border-orange-300 hover:shadow-md'}`}
                  onClick={() => setDeliveryTimeType('scheduled')}
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 bg-gradient-to-br from-orange-600 to-orange-700">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Schedule for Later</h3>
                  <p className="text-gray-600 mb-2 text-sm">Choose specific date and time</p>
                  {deliveryTimeType === 'scheduled' && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-orange-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-semibold text-sm">Selected!</span>
                    </div>
                  )}
                </button>
              </div>
              {deliveryTimeType === 'scheduled' && (
                <div className="mt-4 bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule Delivery Time
                  </h3>
                  <Input
                    type="datetime-local"
                    value={scheduledDeliveryDateTime}
                    onChange={e => setScheduledDeliveryDateTime(e.target.value)}
                    min={new Date(Date.now() + 45 * 60 * 1000).toISOString().slice(0, 16)}
                    className="w-full"
                  />
                  <p className="text-xs text-orange-600 mt-2">
                    Minimum 45 minutes from now. Store hours: 11:00 AM - 10:00 PM
                  </p>
                </div>
              )}
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