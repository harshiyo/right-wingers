import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Truck, Clock, Calendar, ChevronLeft, CheckCircle2, User, Phone, MapPin, Store, ShoppingCart } from 'lucide-react';
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
  orderNumber: string;
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
  const { customerInfo, clearCustomerInfo } = useCustomer();
  const { clearCart } = useCart();
  const { selectedStore, clearSelectedStore } = useStore();
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

  const handlePlaceAnotherOrder = () => {
    clearCustomerInfo();
    clearSelectedStore();
    navigate('/store-selection');
  };

  if (!orderDetails || !orderId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-red-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-200/10 to-pink-200/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Confirmed!</h1>
          <p className="text-gray-600 text-lg">Your order has been successfully placed.</p>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Order Info */}
          <div className="space-y-4">
            {/* Order Details Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-600">#</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-semibold text-gray-900">{orderDetails.orderNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                    {orderDetails?.orderType === 'pickup' ? (
                      <Package className="w-4 h-4 text-orange-600" />
                    ) : (
                      <Truck className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Type</p>
                    <p className="font-semibold text-gray-900">
                      {orderDetails?.orderType === 'pickup' ? 'Pickup' : 'Delivery'}
                    </p>
                  </div>
                </div>
                {orderDetails?.pickupTime && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pickup Time</p>
                      <p className="font-semibold text-gray-900">
                        {orderDetails.pickupTime.type === 'asap' ? (
                          'Ready in 15-25 minutes'
                        ) : (
                          new Date(orderDetails.pickupTime.scheduledTime!).toLocaleString()
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {orderDetails?.deliveryAddress && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivery Address</p>
                      <p className="font-semibold text-gray-900">
                        {orderDetails.deliveryAddress.street}
                      </p>
                      <p className="text-sm text-gray-600">
                        {orderDetails.deliveryAddress.city}, {orderDetails.deliveryAddress.postalCode}
                      </p>
                    </div>
                  </div>
                )}
                {customerInfo && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Customer Name</p>
                        <p className="font-semibold text-gray-900">{customerInfo.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Customer Phone</p>
                        <p className="font-semibold text-gray-900">{customerInfo.phone}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Store Info and Pricing Summary */}
          <div className="space-y-4">
            {/* Store Information Card */}
            {selectedStore && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Store Information</h2>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">{selectedStore.name}</h3>
                  <p className="text-gray-600">{selectedStore.address}</p>
                  <p className="text-gray-600">{selectedStore.phone}</p>
                </div>
              </div>
            )}

            {/* Pricing Summary Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
              </div>
              <div className="space-y-4">
                <div className="pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">${orderDetails?.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (13%)</span>
                    <span className="font-medium">${orderDetails?.tax.toFixed(2)}</span>
                  </div>
                  {orderDetails?.orderType === 'delivery' && (
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      <span className="font-medium">${deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-200">
                    <span className="text-gray-900">Total</span>
                    <span className="text-red-600">${orderDetails?.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button - Full Width at Bottom */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
          <button
            onClick={handlePlaceAnotherOrder}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] text-lg"
          >
            Place Another Order
          </button>
        </div>
      </div>
    </div>
  );
} 