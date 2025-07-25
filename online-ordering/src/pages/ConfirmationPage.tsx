import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Truck, Clock, Calendar, ChevronLeft, CheckCircle2, User, Phone } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  customizations?: string[];
}

interface OrderDetails {
  orderId: string;
  orderType: 'pickup' | 'delivery';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  pickupTime?: {
    type: 'asap' | 'scheduled';
    scheduledTime?: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
  };
}

export default function ConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { customerInfo } = useCustomer();
  const { clearCart } = useCart();
  const { selectedStore } = useStore();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);

  useEffect(() => {
    if (!location.state?.orderDetails) {
      navigate('/');
      return;
    }

    const orderDetails = location.state.orderDetails;
    setOrderDetails(orderDetails);
    setOrderId(orderDetails.orderId);
    
    clearCart();

    return () => {
      sessionStorage.removeItem('lastOrderId');
      sessionStorage.removeItem('orderType');
      sessionStorage.removeItem('pickupTime');
      sessionStorage.removeItem('scheduledDateTime');
      sessionStorage.removeItem('deliveryAddress');
    };
  }, []);

  const handleBack = () => {
    navigate('/menu');
  };

  const handleNewOrder = () => {
    navigate('/');
  };

  if (!orderDetails || !orderId) return null;

  return (
    <div className="container mx-auto p-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 text-green-500">
            <CheckCircle2 className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">Your order has been successfully placed.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">Order Details</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Order ID</div>
                  <div className="font-medium">{orderId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Order Type</div>
                  <div className="font-medium">{orderDetails?.orderType === 'pickup' ? 'Pickup' : 'Delivery'}</div>
                </div>
                {orderDetails?.pickupTime && (
                  <div>
                    <div className="text-sm text-gray-600">Pickup Time</div>
                    <div className="font-medium">
                      {orderDetails.pickupTime.type === 'asap' ? (
                        'Ready in 15-25 minutes'
                      ) : (
                        new Date(orderDetails.pickupTime.scheduledTime!).toLocaleString()
                      )}
                    </div>
                  </div>
                )}
                {orderDetails?.deliveryAddress && (
                  <div>
                    <div className="text-sm text-gray-600">Delivery Address</div>
                    <div className="font-medium">
                      {orderDetails.deliveryAddress.street}<br />
                      {orderDetails.deliveryAddress.city}, {orderDetails.deliveryAddress.postalCode}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Store Information */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">Store Information</h2>
              {selectedStore && (
                <>
                  <h3 className="font-medium">{selectedStore.name}</h3>
                  <p className="text-gray-600">{selectedStore.address}</p>
                  <p className="text-gray-600">{selectedStore.phone}</p>
                </>
              )}
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              {customerInfo && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span>{customerInfo.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-600" />
                    <span>{customerInfo.phone}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-4">
                {orderDetails?.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                    </div>
                    <div className="text-right">
                      <div>${item.total.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${orderDetails?.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (13%)</span>
                    <span>${orderDetails?.tax.toFixed(2)}</span>
                  </div>
                  {orderDetails?.orderType === 'delivery' && (
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      <span>${deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t">
                    <span>Total</span>
                    <span>${orderDetails?.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/menu')}
                className="w-full py-3 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 text-white rounded-lg shadow-lg hover:shadow-xl transition-colors duration-200 font-bold"
              >
                Place Another Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 