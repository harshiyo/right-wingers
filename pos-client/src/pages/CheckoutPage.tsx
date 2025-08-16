import React from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Receipt, 
  User, 
  MapPin, 
  Clock, 
  Phone, 
  ShoppingCart,
  ArrowLeft,
  Check,
  Printer,
  MessageSquare,
  Percent,
  CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TopBar } from '../components/layout/TopBar';
import { PaymentMethodCard } from '../components/checkout/PaymentMethodCard';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { useCheckout } from '../hooks/useCheckout';
import { printReceiptIfLocal } from '../services/printReceiptIfLocal';
import { Order } from '../services/types';

const CheckoutPage = () => {
  const {
    // State
    state,
    updateState,
    
    // Data
    customer,
    phone,
    orderType,
    cartItems,
    subtotal,
    tax,
    discountAmount,
    deliveryCharge,
    deliveryChargeDetails,
    total,
    currentStore,
    editingOrderId,
    pickupTime,
    scheduledDateTime,
    deliveryTimeType,
    scheduledDeliveryDateTime,
    deliveryAddress,
    
    // Handlers
    handleGoBack,
    handleDiscountCodeChange,
    validateDiscountCode,
    removeDiscountCode,
    handleProcessPayment,
    handleCompleteOrder,
    handleCompleteOrderClick,
    handleModificationPromptChoice,
    generateModifiedReceipt,
    
    // Utilities
    convertInstructionsToNames,
    
    // Refs
    modifiedItemsRef,
  } = useCheckout();

  // Early return if no data
  if (!cartItems.length || !customer || !phone) {
    return null;
  }

  // Payment method options
  const paymentMethods = [
    {
      method: 'cash' as const,
      icon: DollarSign,
      title: 'Cash',
      description: 'Pay with cash'
    },
    {
      method: 'card' as const,
      icon: CreditCard,
      title: 'Card',
      description: 'Credit/Debit card'
    }
  ];

  // Receipt printing functions
  const printFullReceipt = async () => {
    if (!state.savedOrderId || !state.savedOrderNumber) return;
    const orderForPrint: Order = {
      id: state.savedOrderId,
      storeId: currentStore?.id ?? '',
      storeName: currentStore?.name ?? '',
      orderNumber: state.savedOrderNumber,
      customerInfo: {
        name: customer.name,
        phone: phone,
      },
      items: cartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        modifiers: [],
        extraCharges: item.extraCharges || 0,
        customizations: convertInstructionsToNames(item.customizations),
      })),
      total: total,
      createdAt: Date.now(),
      storeAddress: currentStore?.address ?? '',
      storePhone: currentStore?.phone ?? '',
      orderType: orderType,
      subtotal: subtotal,
      tax: tax,
      discount: discountAmount,
      paymentMethod: state.paymentMethod,
      discounts: state.appliedDiscountCode ? [{
        id: state.appliedDiscountCode.id,
        name: state.appliedDiscountCode.name,
        amount: discountAmount,
        type: state.appliedDiscountCode.type
      }] : [],
      discountTotal: discountAmount,
      pickupDetails: orderType === 'pickup' ? {
        estimatedTime: '15-25 minutes',
        ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {})
      } : undefined,
      deliveryDetails: orderType === 'delivery' ? {
        ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}),
        ...(customer.address ? {
          street: customer.address.street,
          city: customer.address.city,
          postalCode: customer.address.postalCode
        } : {})
      } : undefined,
      ...(state.orderNote.trim() && { orderNote: state.orderNote.trim() }),
    };
    const receiptType = editingOrderId ? 'modified-full' : 'new';
    await printReceiptIfLocal(orderForPrint, currentStore?.id ?? '', receiptType);
  };

  const printModifiedReceipt = async () => {
    if (!state.savedOrderId || !state.savedOrderNumber) return;
    const originalItemsRaw = localStorage.getItem('originalOrderItems');
    let originalItems = [];
    try {
      if (originalItemsRaw) originalItems = JSON.parse(originalItemsRaw);
    } catch {}
    
    // Use the diff function from the hook
    const { added, removed, updated } = (() => {
      const origMap = new Map(originalItems.map((item: any) => [item.id, item]));
      const modMap = new Map(cartItems.map(item => [item.id, item]));
      const added: any[] = [];
      const removed: any[] = [];
      const updated: any[] = [];

      for (const modItem of cartItems) {
        const origItem = origMap.get(modItem.id);
        if (!origItem) {
          added.push({ ...modItem, isNew: true });
        } else {
          const normOrig = JSON.stringify((origItem as any).customizations);
          const normMod = JSON.stringify(modItem.customizations);
          if (
            (origItem as any).quantity !== modItem.quantity ||
            (origItem as any).price !== modItem.price ||
            normOrig !== normMod
          ) {
            updated.push({ ...modItem, isUpdated: true });
          }
        }
      }
      
      for (const origItem of originalItems) {
        if (!modMap.has((origItem as any).id)) {
          removed.push({ ...(origItem as any), isRemoved: true });
        }
      }
      
      return { added, removed, updated };
    })();

    const items = [
      ...added.map(i => ({ ...i, isNew: true })),
      ...removed.map(i => ({ ...i, isRemoved: true })),
      ...updated.map(i => ({ ...i, isUpdated: true })),
    ];
    
    const orderForPrint: Order = {
      id: state.savedOrderId,
      storeId: currentStore?.id ?? '',
      storeName: currentStore?.name ?? '',
      orderNumber: state.savedOrderNumber,
      customerInfo: {
        name: customer.name,
        phone: phone,
      },
      items,
      total: total,
      createdAt: Date.now(),
      storeAddress: currentStore?.address ?? '',
      storePhone: currentStore?.phone ?? '',
      orderType: orderType,
      subtotal: subtotal,
      tax: tax,
      discount: discountAmount,
      paymentMethod: state.paymentMethod,
      discounts: state.appliedDiscountCode ? [{
        id: state.appliedDiscountCode.id,
        name: state.appliedDiscountCode.name,
        amount: discountAmount,
        type: state.appliedDiscountCode.type
      }] : [],
      discountTotal: discountAmount,
      pickupDetails: orderType === 'pickup' ? {
        estimatedTime: '15-25 minutes',
        ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {})
      } : undefined,
      deliveryDetails: orderType === 'delivery' ? {
        ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}),
        ...(customer.address ? {
          street: customer.address.street,
          city: customer.address.city,
          postalCode: customer.address.postalCode
        } : {})
      } : undefined,
      ...(state.orderNote.trim() && { orderNote: state.orderNote.trim() }),
    };
    await printReceiptIfLocal(orderForPrint, currentStore?.id ?? '', 'modified-partial');
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-orange-50">
      <TopBar 
        cartItemsCount={cartItems.length}
        cartTotal={total}
        customerInfo={customer}
        orderType={orderType}
        currentStep="checkout"
        onQuickAddClick={() => {}}
      />
      
      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto h-full">
          {/* Compact Header */}
          

          {/* Main Content - 2 Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Left Column - Customer Info & Payment Method */}
            <div className="space-y-3 h-full">
              {/* Customer Info - New Design */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                {/* Red Header */}
                <div className="bg-red-600 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Customer Information</h2>
                    <p className="text-red-100 text-sm">Order Details & Preferences</p>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                                     {/* Customer Name - Light Blue Card */}
                   <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                       <User className="h-5 w-5 text-white" />
                     </div>
                     <div className="flex-1">
                       <p className="text-gray-500 text-xs font-medium">CUSTOMER NAME</p>
                       <p className="text-gray-900 font-bold text-base">{customer.name}</p>
                     </div>
                   </div>
                  
                                     {/* Phone Number - Light Blue Card */}
                   <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                       <Phone className="h-5 w-5 text-white" />
                     </div>
                     <div className="flex-1">
                       <p className="text-gray-500 text-xs font-medium">PHONE NUMBER</p>
                       <p className="text-gray-900 font-bold text-base">{phone}</p>
                     </div>
                   </div>
                  
                                     {/* Order Type - Light Yellow/Orange Card */}
                   <div className="bg-orange-50 rounded-lg p-3 flex items-center gap-3">
                     <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                       <Clock className="h-5 w-5 text-white" />
                     </div>
                     <div className="flex-1">
                       <p className="text-gray-500 text-xs font-medium">ORDER TYPE</p>
                       <p className="text-gray-900 font-bold text-base capitalize">{orderType}</p>
                       <div className="flex items-center gap-1 mt-1">
                         <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                         <span className="text-orange-600 text-xs font-medium">
                           {orderType === 'pickup' 
                             ? (pickupTime === 'scheduled' && scheduledDateTime 
                                 ? `Scheduled: ${new Date(scheduledDateTime).toLocaleString()}`
                                 : 'ASAP: 15-25 minutes')
                             : orderType === 'delivery'
                               ? (deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime
                                   ? `Scheduled: ${new Date(scheduledDeliveryDateTime).toLocaleString()}`
                                   : 'ASAP: 30-45 minutes')
                               : 'Ready when prepared'
                           }
                         </span>
                       </div>
                     </div>
                   </div>

                                     {/* Delivery Address (if delivery order) */}
                   {orderType === 'delivery' && customer.address && (
                     <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                         <MapPin className="h-5 w-5 text-white" />
                       </div>
                       <div className="flex-1">
                         <p className="text-gray-500 text-xs font-medium">DELIVERY ADDRESS</p>
                         <p className="text-gray-900 font-bold text-base">
                           {customer.address.street}
                           {customer.address.city && `, ${customer.address.city}`}
                           {customer.address.postalCode && `, ${customer.address.postalCode}`}
                         </p>
                       </div>
                     </div>
                   )}

                  {/* Order Notes Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gray-500 rounded flex items-center justify-center">
                        <MessageSquare className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium">Order Notes</p>
                        <p className="text-gray-400 text-xs">Special instructions or preferences</p>
                      </div>
                    </div>
                                         <textarea
                       value={state.orderNote}
                       onChange={(e) => updateState({ orderNote: e.target.value })}
                       placeholder="Add any special instructions or notes for your order..."
                       className="w-full p-3 text-base border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                       rows={3}
                       maxLength={500}
                     />
                    {state.orderNote.length > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-blue-600 text-xs font-medium">Note Added</span>
                        </div>
                        <p className="text-gray-500 text-xs">
                          {state.orderNote.length}/500 characters
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Payment Method - Compact */}
              <div className="bg-white rounded-xl shadow-lg p-3 border border-gray-200 flex-1 flex flex-col">
                <h2 className="text-base font-bold text-gray-900 mb-3">Payment Method</h2>
                
                {/* Payment Method Cards - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {paymentMethods.map(({ method, icon, title, description }) => (
                    <PaymentMethodCard
                      key={method}
                      method={method}
                      icon={icon}
                      title={title}
                      description={description}
                      isSelected={state.paymentMethod === method}
                      onClick={() => updateState({ paymentMethod: method })}
                    />
                  ))}
                </div>

                {/* Payment Status & Discount Section - Same Row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Payment Status Section */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      Payment Status
                    </h3>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentStatus"
                          value="unpaid"
                          checked={state.paymentStatus === 'unpaid'}
                          onChange={(e) => updateState({ paymentStatus: e.target.value as 'paid' | 'unpaid' })}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Unpaid</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentStatus"
                          value="paid"
                          checked={state.paymentStatus === 'paid'}
                          onChange={(e) => updateState({ paymentStatus: e.target.value as 'paid' | 'unpaid' })}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Paid</span>
                      </label>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {state.paymentStatus === 'unpaid' 
                        ? 'Payment to be collected later'
                        : 'No payment collection needed'
                      }
                    </p>
                  </div>

                  {/* Discount Section */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Percent className="h-3 w-3" />
                      Discount
                    </h3>
                    
                    {/* Discount Code Input */}
                    <div className="mb-2">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter discount code"
                          value={state.discountCode}
                          onChange={(e) => handleDiscountCodeChange(e.target.value)}
                          className="flex-1"
                          disabled={state.isValidatingCode}
                        />
                        <Button
                          onClick={validateDiscountCode}
                          disabled={!state.discountCode.trim() || state.isValidatingCode}
                          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {state.isValidatingCode ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            'Apply'
                          )}
                        </Button>
                      </div>
                      {state.discountCodeError && (
                        <p className="text-red-600 text-xs mt-1">{state.discountCodeError}</p>
                      )}
                      {state.appliedDiscountCode && (
                        <div className="flex items-center justify-between mt-1 p-1 bg-green-50 rounded text-xs">
                          <span className="text-green-800">
                            ✓ {state.appliedDiscountCode.name} applied
                          </span>
                          <button
                            onClick={removeDiscountCode}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {discountAmount > 0 && (
                      <p className="text-red-600 text-xs mt-1">
                        Discount applied: -${discountAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 mt-auto flex-shrink-0">
                  {/* Back to Menu and Pay button row */}
                  {!state.showReceiptOptions && (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={handleGoBack}
                        className="flex-1"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Menu
                      </Button>
                      <Button
                        onClick={handleProcessPayment}
                        disabled={state.isProcessing || state.orderSaved}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        {state.isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Placing Order...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Place Order
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {/* Receipt Action Buttons - only show after payment */}
                  {state.showReceiptOptions && (
                    <div className="flex flex-col md:flex-row gap-2 w-full min-w-0">
                      {editingOrderId ? (
                        <>
                          <Button
                            onClick={printFullReceipt}
                            variant="outline"
                            className="flex-1"
                            disabled={!state.savedOrderId || !state.savedOrderNumber}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Full Receipt
                          </Button>
                          <Button
                            onClick={printModifiedReceipt}
                            variant="outline"
                            className="flex-1"
                            disabled={!state.savedOrderId || !state.savedOrderNumber}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Modified Receipt
                          </Button>
                          <Button
                            onClick={() => {
                              // Clear cart and navigate - this would need to be handled in the hook
                              window.location.href = '/customer-lookup';
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            Start New Order
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={async () => {
                              if (!state.savedOrderId || !state.savedOrderNumber) return;
                              const orderForPrint: Order = {
                                id: state.savedOrderId,
                                storeId: currentStore?.id ?? '',
                                storeName: currentStore?.name ?? '',
                                orderNumber: state.savedOrderNumber,
                                customerInfo: {
                                  name: customer.name,
                                  phone: phone,
                                },
                                items: cartItems.map(item => ({
                                  name: item.name,
                                  quantity: item.quantity,
                                  price: item.price,
                                  modifiers: [],
                                  extraCharges: item.extraCharges || 0,
                                  customizations: convertInstructionsToNames(item.customizations),
                                })),
                                total: total,
                                createdAt: Date.now(),
                                storeAddress: currentStore?.address ?? '',
                                storePhone: currentStore?.phone ?? '',
                                orderType: orderType,
                                subtotal: subtotal,
                                tax: tax,
                                paymentMethod: state.paymentMethod,
                                pickupDetails: orderType === 'pickup' ? {
                                  estimatedTime: '15-25 minutes',
                                  ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {})
                                } : undefined,
                                deliveryDetails: orderType === 'delivery' ? {
                                  ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}),
                                  ...(customer.address ? {
                                    street: customer.address.street,
                                    city: customer.address.city,
                                    postalCode: customer.address.postalCode
                                  } : {})
                                } : undefined,
                                ...(state.orderNote.trim() && { orderNote: state.orderNote.trim() }),
                              };
                              await printReceiptIfLocal(orderForPrint, currentStore?.id ?? '', 'new');
                            }}
                            variant="outline"
                            className="flex-1"
                            disabled={!state.savedOrderId || !state.savedOrderNumber}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Receipt
                          </Button>
                          <Button
                            onClick={() => {
                              window.location.href = '/customer-lookup';
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            Start New Order
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  {/* Payment status message */}
                  {state.showReceiptOptions && (
                    <div className="flex items-center gap-2 text-red-600 justify-center py-2">
                      <Check className="h-5 w-5" />
                      <span className="font-semibold">Payment Successful!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 h-full flex flex-col">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 flex-shrink-0">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                    {cartItems.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                </h2>
                <div className="flex-1 min-h-0 overflow-hidden">
                                <OrderSummary
                cartItems={cartItems}
                subtotal={subtotal}
                tax={tax}
                discount={discountAmount}
                deliveryCharge={deliveryCharge}
                deliveryChargeDetails={deliveryChargeDetails}
                total={total}
              />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for order success */}
      {state.showOrderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
            <h2 className="text-lg font-bold mb-4">Order Updated Successfully!</h2>
            <p className="mb-6">Your order has been updated successfully.</p>
            <Button
              onClick={() => {
                updateState({ showOrderSuccess: false });
                window.location.href = '/customer-lookup';
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Continue to Customer Lookup
            </Button>
          </div>
        </div>
      )}

      {/* Modal for modification prompt - DEPRECATED: Now using direct update */}
      {state.showModificationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
            <h2 className="text-lg font-bold mb-4">Send full order or only modified items?</h2>
            <p className="mb-6">Would you like to send the <span className="font-semibold">full order</span> to the kitchen, or <span className="font-semibold">only the modified items</span>?</p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => {
                  handleModificationPromptChoice('full');
                }} 
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Full Order
              </Button>
              <Button 
                onClick={() => {
                  handleModificationPromptChoice('modified');
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Only Modified Items
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage; 