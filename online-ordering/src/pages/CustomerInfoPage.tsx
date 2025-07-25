import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, ArrowRight, CheckCircle } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';

interface CustomerFormInfo {
  fullName: string;
  phone: string;
}

export default function CustomerInfoPage() {
  const navigate = useNavigate();
  const { customerInfo, updateCustomerInfo } = useCustomer();
  const [formInfo, setFormInfo] = useState<CustomerFormInfo>({
    fullName: customerInfo?.fullName || '',
    phone: customerInfo?.phone || ''
  });

  // Update form when customerInfo changes (e.g., on page refresh)
  useEffect(() => {
    if (customerInfo) {
      setFormInfo({
        fullName: customerInfo.fullName || '',
        phone: customerInfo.phone || ''
      });
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
    formInfo.phone.replace(/\D/g, '').length === 10
  );

  const handleContinue = () => {
    if (isInfoComplete) {
      // Final update to ensure all info is saved
      updateCustomerInfo(formInfo);
      navigate('/menu');
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
          disabled={!isInfoComplete}
          className="px-6 py-2 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 text-white rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 text-sm"
        >
          <span className="font-bold">Continue to Menu</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 