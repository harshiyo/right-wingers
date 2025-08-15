import React, { memo } from 'react';
import { User, Phone, Clock, MapPin, CheckCircle } from 'lucide-react';
import { Customer } from '../../hooks/useCheckout';

interface CustomerInfoCardProps {
  customer: Customer;
  orderType: string;
  phone: string;
  pickupTime?: 'asap' | 'scheduled';
  scheduledDateTime?: string;
  deliveryTimeType?: 'asap' | 'scheduled';
  scheduledDeliveryDateTime?: string;
}

export const CustomerInfoCard = memo(({ 
  customer, 
  orderType, 
  phone,
  pickupTime,
  scheduledDateTime,
  deliveryTimeType,
  scheduledDeliveryDateTime
}: CustomerInfoCardProps) => {
  if (!customer || !customer.name) {
    return null;
  }

  // Enhanced timing and order type information
  const getOrderTypeInfo = () => {
    if (orderType === 'pickup') {
      if (pickupTime === 'scheduled' && scheduledDateTime) {
        return {
          icon: <Clock className="h-4 w-4 text-orange-600" />,
          label: 'Scheduled Pickup',
          time: new Date(scheduledDateTime).toLocaleString(),
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-800'
        };
      } else {
        return {
          icon: <Clock className="h-4 w-4 text-green-600" />,
          label: 'Pickup ASAP',
          time: 'Ready in 15-25 minutes',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800'
        };
      }
    } else if (orderType === 'delivery') {
      if (deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime) {
        return {
          icon: <Clock className="h-4 w-4 text-purple-600" />,
          label: 'Scheduled Delivery',
          time: new Date(scheduledDeliveryDateTime).toLocaleString(),
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-800'
        };
      } else {
        return {
          icon: <Clock className="h-4 w-4 text-blue-600" />,
          label: 'Delivery ASAP',
          time: 'Delivered in 30-45 minutes',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-800'
        };
      }
    } else {
      return {
        icon: <Clock className="h-4 w-4 text-gray-600" />,
        label: 'Dine-in',
        time: 'Ready when prepared',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-800'
      };
    }
  };

  const orderTypeInfo = getOrderTypeInfo();

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2 flex-shrink-0">
        <User className="h-4 w-4" />
        Customer Information
      </h2>
      <div className="space-y-3 flex-1">
        {/* Customer Name */}
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <div className="p-1 rounded-lg bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="font-bold text-green-800 text-xs">{customer.name}</p>
            <p className="text-xs text-gray-600">Customer</p>
          </div>
        </div>
        
        {/* Phone Number */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <div className="p-1 rounded-lg bg-blue-100">
            <Phone className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-xs">{phone}</p>
            <p className="text-xs text-gray-600">Phone</p>
          </div>
        </div>
        
        {/* Order Type & Timing */}
        <div className={`flex items-center gap-2 p-3 ${orderTypeInfo.bgColor} rounded-lg`}>
          <div className={`p-1.5 rounded-lg ${orderTypeInfo.bgColor.replace('50', '100')}`}>
            {orderTypeInfo.icon}
          </div>
          <div>
            <p className={`font-semibold ${orderTypeInfo.textColor} text-sm capitalize`}>
              {orderTypeInfo.label}
            </p>
            <p className="text-xs text-gray-600">{orderTypeInfo.time}</p>
          </div>
        </div>

        {/* Delivery Address (if delivery order) */}
        {orderType === 'delivery' && customer.address && (
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="p-1.5 rounded-lg bg-gray-100 mt-0.5">
              <MapPin className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Delivery Address</p>
              <p className="text-xs text-gray-600">
                {customer.address.street}
                {customer.address.city && `, ${customer.address.city}`}
                {customer.address.postalCode && `, ${customer.address.postalCode}`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CustomerInfoCard.displayName = 'CustomerInfoCard';
