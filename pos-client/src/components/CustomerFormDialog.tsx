import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PhoneInput } from './ui/PhoneInput';
import { X } from 'lucide-react';
import { Customer } from '../data/customers';

interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (customer: Omit<Customer, 'id' | 'orderCount' | 'lastOrderDate'>) => void;
  initialPhone?: string;
}

export const CustomerFormDialog = ({ open, onClose, onSubmit, initialPhone = '' }: CustomerFormDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: initialPhone,
    street: '',
    city: '',
    postalCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when dialog opens
  useEffect(() => {
    if (open && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Update phone when initialPhone changes
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        phone: initialPhone
      }));
    }
  }, [open, initialPhone]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (formData.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Please enter a valid 10-digit phone number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, ''),
        address: {
          street: formData.street.trim() || 'Address not provided',
          city: formData.city.trim() || 'City not provided',
          postalCode: formData.postalCode.trim() || 'N/A',
        },
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      phone: initialPhone,
      street: '',
      city: '',
      postalCode: '',
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div 
        className="rounded-xl w-full max-w-md"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37), 0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Create New Customer</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              ref={nameInputRef}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter full name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <PhoneInput
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(123) 456-7890"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address <span className="text-gray-500">(optional)</span>
            </label>
            <Input
              value={formData.street}
              onChange={(e) => handleInputChange('street', e.target.value)}
              placeholder="123 Main Street (optional)"
              className={errors.street ? 'border-red-500' : ''}
            />
            {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-gray-500">(optional)</span>
              </label>
              <Input
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Toronto (optional)"
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code <span className="text-gray-500">(optional)</span>
              </label>
              <Input
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                placeholder="M5V 3A1 (optional)"
                className={errors.postalCode ? 'border-red-500' : ''}
              />
              {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1"
            >
              Create Customer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 