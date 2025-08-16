import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useOfflineOrders } from './useOfflineOrders';
import { useStore } from '../context/StoreContext';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPizzaInstructionLabels, getWingInstructionLabels } from '../utils/cartHelpers';
import { DiscountCodeService, type DiscountCode } from '../services/discountCodes';
import { Order } from '../services/types';
import { calculateDeliveryCharge, type DeliveryChargeResult } from '../services/deliveryCharges';

// Types
export interface CartItem {
  id: string;
  baseId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  customizations?: any;
  extraCharges?: number;
  isCombo?: boolean;
  isNew?: boolean;
  isUpdated?: boolean;
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
  };
}

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'split';

export interface PaymentDetails {
  method: PaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
  mobileAmount?: number;
  discount?: number;
}

export interface CheckoutState {
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'unpaid';
  cashAmount: string;
  cardAmount: string;
  mobileAmount: string;
  discount: number;
  discountCode: string;
  appliedDiscountCode: DiscountCode | null;
  discountCodeError: string;
  isValidatingCode: boolean;
  isProcessing: boolean;
  showReceiptOptions: boolean;
  taxRate: number;
  orderNote: string;
  orderSaved: boolean;
  savedOrderId: string | null;
  savedOrderNumber: string | null;
  showOrderSuccess: boolean;
  showModificationPrompt: boolean;
  pendingOrder: boolean;
  deliveryCharge: number;
  deliveryChargeDetails: DeliveryChargeResult | null;
}

export const useCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, clearCart } = useCart();
  const { createOrder } = useOfflineOrders();
  const { currentStore } = useStore();
  
  const { customer, phone, orderType = 'Pickup', editingOrderId } = location.state || {};
  const { pickupTime, scheduledDateTime, deliveryTimeType, scheduledDeliveryDateTime, deliveryAddress, distance } = location.state || {};
  
  console.log('🔄 useCheckout: Received location state:', {
    customer: !!customer,
    phone,
    orderType,
    editingOrderId,
    pickupTime,
    scheduledDateTime,
    deliveryTimeType,
    scheduledDeliveryDateTime,
    deliveryAddress: !!deliveryAddress,
    distance
  });

  // State management
  const [state, setState] = useState<CheckoutState>({
    paymentMethod: 'card',
    paymentStatus: 'unpaid',
    cashAmount: '',
    cardAmount: '',
    mobileAmount: '',
    discount: 0,
    discountCode: '',
    appliedDiscountCode: null,
    discountCodeError: '',
    isValidatingCode: false,
    isProcessing: false,
    showReceiptOptions: false,
    taxRate: 0.13,
    orderNote: '',
    orderSaved: false,
    savedOrderId: null,
    savedOrderNumber: null,
    showOrderSuccess: false,
    showModificationPrompt: false,
    pendingOrder: false,
    deliveryCharge: 0,
    deliveryChargeDetails: null,
  });

  const modifiedItemsRef = useRef<any[]>([]);

  // Fetch instruction tiles
  const [pizzaInstructionTiles] = useCollection(
    query(collection(db, 'pizzaInstructions'), orderBy('sortOrder'))
  );
  const [wingInstructionTiles] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );

  // Update state helper
  const updateState = useCallback((updates: Partial<CheckoutState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load store's tax rate
  useEffect(() => {
    const loadTaxRate = async () => {
      if (!currentStore?.id) return;
      
      try {
        const storeDoc = await getDoc(doc(db, 'stores', currentStore.id));
        const storeTaxRate = storeDoc.data()?.taxRate;
        if (storeTaxRate) {
          updateState({ taxRate: storeTaxRate / 100 });
        }
      } catch (error) {
        console.error('Error loading tax rate:', error);
      }
    };

    loadTaxRate();
  }, [currentStore?.id, updateState]);

  // Save original order to localStorage for modification diff/receipt
  useEffect(() => {
    if (editingOrderId && location.state?.originalOrder) {
      localStorage.setItem('originalOrder', JSON.stringify(location.state.originalOrder));
    }
  }, [editingOrderId, location.state]);

  // Load order note when modifying an existing order
  useEffect(() => {
    if (editingOrderId && location.state?.originalOrder?.orderNote) {
      updateState({ orderNote: location.state.originalOrder.orderNote });
    }
  }, [editingOrderId, location.state?.originalOrder?.orderNote, updateState]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum: number, item: CartItem) => {
      const itemTotal = (item.price + (item.extraCharges || 0)) * item.quantity;
      return sum + itemTotal;
    }, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => state.discount, [state.discount]);
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * state.taxRate;
  
  // Calculate delivery charge if delivery order
  const deliveryCharge = useMemo(() => {
    if ((orderType !== 'Delivery' && orderType !== 'delivery') || !distance) return 0;
    return state.deliveryCharge;
  }, [orderType, distance, state.deliveryCharge]);
  
  const total = discountedSubtotal + tax + deliveryCharge;

  // Redirect if no cart data
  useEffect(() => {
    if (!cartItems.length || !customer || !phone) {
      navigate('/menu', { state: { customer, orderType } });
      return;
    }
  }, [cartItems, customer, phone, navigate, orderType]);

  // Calculate delivery charge when distance or subtotal changes
  useEffect(() => {
    const calculateDelivery = async () => {
      console.log('🚚 [CHECKOUT DEBUG] Delivery calculation triggered:', {
        orderType,
        distance,
        subtotal,
        currentStoreId: currentStore?.id
      });
      
      if ((orderType === 'Delivery' || orderType === 'delivery') && distance && subtotal > 0) {
        console.log('🚚 [CHECKOUT DEBUG] Calculating delivery charge for delivery order');
        try {
          const result = await calculateDeliveryCharge(distance, subtotal, currentStore?.id);
          console.log('🚚 [CHECKOUT DEBUG] Delivery charge result:', result);
          updateState({ 
            deliveryCharge: result.charge,
            deliveryChargeDetails: result
          });
        } catch (error) {
          console.error('🚚 [CHECKOUT DEBUG] Error calculating delivery charge:', error);
          // Fallback to default calculation
          const defaultCharge = subtotal >= 30 ? 0 : 3.99;
          console.log('🚚 [CHECKOUT DEBUG] Using fallback charge:', defaultCharge);
          updateState({ 
            deliveryCharge: defaultCharge,
            deliveryChargeDetails: null
          });
        }
      } else {
        console.log('🚚 [CHECKOUT DEBUG] Not calculating delivery charge:', {
          reason: !orderType ? 'No order type' : 
                  !distance ? 'No distance' : 
                  subtotal <= 0 ? 'No subtotal' : 'Unknown'
        });
        updateState({ deliveryCharge: 0, deliveryChargeDetails: null });
      }
    };

    calculateDelivery();
  }, [orderType, distance, subtotal, currentStore?.id, updateState]);

  // Helper function to convert instruction IDs to names
  const convertInstructionsToNames = useCallback((customizations: any) => {
    if (!customizations) return customizations;
    
    if (!pizzaInstructionTiles || !wingInstructionTiles) {
      console.warn('Instruction tiles not loaded yet, using original customizations');
      return customizations;
    }
    
    const converted = { ...customizations };
    
    // Handle regular instructions
    if (converted.instructions && Array.isArray(converted.instructions)) {
      if (converted.type === 'wings') {
        converted.instructions = getWingInstructionLabels(wingInstructionTiles, converted.instructions);
      } else {
        converted.instructions = getPizzaInstructionLabels(pizzaInstructionTiles, converted.instructions);
      }
    }
    
    // Handle combo customizations
    if (Array.isArray(converted)) {
      converted.forEach((step) => {
        if (step && step.instructions && Array.isArray(step.instructions)) {
          if (step.type === 'wings') {
            step.instructions = getWingInstructionLabels(wingInstructionTiles, step.instructions);
          } else {
            step.instructions = getPizzaInstructionLabels(pizzaInstructionTiles, step.instructions);
          }
        }
      });
    } else if (converted && typeof converted === 'object' && !Array.isArray(converted)) {
      const keys = Object.keys(converted);
      if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
        keys.forEach(key => {
          const step = converted[key];
          if (step && step.instructions && Array.isArray(step.instructions)) {
            if (step.type === 'wings') {
              step.instructions = getWingInstructionLabels(wingInstructionTiles, step.instructions);
            } else {
              step.instructions = getPizzaInstructionLabels(pizzaInstructionTiles, step.instructions);
            }
          }
        });
      }
    }
    
    return converted;
  }, [pizzaInstructionTiles, wingInstructionTiles]);

  // Utility to deeply remove undefined fields
  const deepRemoveUndefined = useCallback((obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(deepRemoveUndefined);
    } else if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, deepRemoveUndefined(v)])
      );
    }
    return obj;
  }, []);

  // Navigation handlers
  const handleGoBack = useCallback(() => {
    const backState = { 
      customer, 
      phone, 
      orderType,
      editingOrderId,
      pickupTime,
      scheduledDateTime,
      deliveryTimeType,
      scheduledDeliveryDateTime,
      deliveryAddress,
      distance,
      ...(location.state?.originalOrder ? { originalOrder: location.state.originalOrder } : {}),
      ...(location.state?.orderNumber ? { orderNumber: location.state.orderNumber } : {})
    };
    
    console.log('🔄 useCheckout: handleGoBack navigating to menu with state:', backState);
    
    navigate('/menu', { state: backState });
  }, [navigate, customer, phone, orderType, editingOrderId, pickupTime, scheduledDateTime, deliveryTimeType, scheduledDeliveryDateTime, deliveryAddress, distance, location.state]);

  // Discount code handlers
  const handleDiscountCodeChange = useCallback((value: string) => {
    updateState({ 
      discountCode: value,
      discountCodeError: '',
      ...(state.appliedDiscountCode && {
        appliedDiscountCode: null,
        discount: 0
      })
    });
  }, [state.appliedDiscountCode, updateState]);

  const validateDiscountCode = useCallback(async () => {
    if (!state.discountCode.trim()) {
      updateState({ discountCodeError: 'Please enter a discount code' });
      return;
    }

    updateState({ isValidatingCode: true, discountCodeError: '' });

    try {
      const result = await DiscountCodeService.validateDiscountCode(
        state.discountCode,
        subtotal,
        orderType
      );

      if (result.isValid && result.discountCode && result.discountAmount) {
        updateState({
          appliedDiscountCode: result.discountCode,
          discount: result.discountAmount,
          discountCodeError: ''
        });
      } else {
        updateState({
          discountCodeError: result.error || 'Invalid discount code',
          appliedDiscountCode: null,
          discount: 0
        });
      }
    } catch (error) {
      console.error('Error validating discount code:', error);
      updateState({
        discountCodeError: 'Error validating discount code',
        appliedDiscountCode: null,
        discount: 0
      });
    } finally {
      updateState({ isValidatingCode: false });
    }
  }, [state.discountCode, subtotal, orderType, updateState]);

  const removeDiscountCode = useCallback(() => {
    updateState({
      appliedDiscountCode: null,
      discountCode: '',
      discount: 0,
      discountCodeError: ''
    });
  }, [updateState]);

  // Payment processing
  const handleProcessPayment = useCallback(async () => {
    if (state.isProcessing || state.orderSaved) return;
    updateState({ isProcessing: true });

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!currentStore) {
        alert('No store selected. Cannot place order.');
        updateState({ isProcessing: false });
        return;
      }

      let orderData: any = {
        customerInfo: {
          name: customer.name,
          phone: phone,
          ...(customer.email && { email: customer.email }),
          address: customer.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.postalCode}` : undefined,
        },
        items: cartItems.map(item => {
          const base: any = {
            id: item.id,
            baseId: item.baseId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            extraCharges: item.extraCharges || 0,
            imageUrl: item.imageUrl,
          };
          if (item.customizations) {
            const convertedCustomizations = convertInstructionsToNames(item.customizations);
            base.customizations = Object.fromEntries(
              Object.entries(convertedCustomizations).filter(([_, v]) => v !== undefined)
            );
          }
          return base;
        }),
        subtotal: subtotal,
        tax: tax,
        discount: discountAmount,
        total: total,
        orderType: (typeof orderType === 'string' && ['pickup','delivery','dine-in'].includes(orderType.toLowerCase()) ? orderType.toLowerCase() : 'pickup'),
        paymentMethod: state.paymentMethod,
        paymentStatus: state.paymentStatus,
        createdAt: new Date().toISOString(),
        store: {
          id: currentStore.id,
          name: currentStore.name,
          address: currentStore.address,
        },
        discounts: [],
        discountTotal: 0,
        ...(orderType === 'delivery' && customer.address ? { deliveryDetails: { ...customer.address, ...(deliveryAddress || {}), ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}) } } : {}),
        ...(orderType === 'pickup' ? { pickupDetails: { estimatedTime: '15-25 minutes', ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {}) } } : {}),
        ...(state.orderNote.trim() && { orderNote: state.orderNote.trim() }),
        source: location.state?.originalOrder?.source || 'pos',
      };

      if (editingOrderId) {
        const updateData = deepRemoveUndefined(orderData);
        const orderRef = doc(db, 'orders', editingOrderId);
        await updateDoc(orderRef, updateData);

        const orderNumber = location.state?.orderNumber || editingOrderId;
        updateState({
          savedOrderId: editingOrderId,
          savedOrderNumber: orderNumber,
          orderSaved: true,
          showReceiptOptions: true
        });
      } else {
        if (!state.orderSaved) {
          const cleanedOrderData = deepRemoveUndefined(orderData);
          const orderId = await createOrder(cleanedOrderData);
          
          if (state.appliedDiscountCode) {
            try {
              await DiscountCodeService.applyDiscountCode(state.appliedDiscountCode.id);
            } catch (error) {
              console.error('Error applying discount code:', error);
            }
          }
          
          let orderNumber = '';
          try {
            const orderDoc = await getDoc(doc(db, 'orders', orderId));
            orderNumber = orderDoc.exists() ? (orderDoc.data().orderNumber || orderId) : orderId;
          } catch {
            orderNumber = orderId;
          }
          
          updateState({
            savedOrderId: orderId,
            savedOrderNumber: orderNumber,
            orderSaved: true,
            showReceiptOptions: true
          });
        }
      }
      updateState({ isProcessing: false });
    } catch (error) {
      updateState({ isProcessing: false });
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    }
  }, [state, currentStore, customer, phone, cartItems, subtotal, tax, discountAmount, orderType, createOrder, deepRemoveUndefined, deliveryAddress, deliveryTimeType, scheduledDeliveryDateTime, pickupTime, scheduledDateTime, editingOrderId, location.state, convertInstructionsToNames, updateState]);

  // Complete order handler
  const handleCompleteOrder = useCallback(async (modificationType?: 'full' | 'modified') => {
    if (editingOrderId && !modificationType) {
      updateState({ showModificationPrompt: true });
      return;
    }
    
    if (!currentStore) {
      alert('No store selected. Cannot place order.');
      updateState({ pendingOrder: false });
      return;
    }
    
    try {
      const generateOrderNumber = () => {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = Date.now().toString().slice(-4);
        return `RW${dateStr}${timeStr}`;
      };

      let itemsToSend: any[] = cartItems;
      if (editingOrderId) {
        const originalItemsRaw = localStorage.getItem('originalOrderItems');
        let originalItems: any[] = [];
        try {
          if (originalItemsRaw) originalItems = JSON.parse(originalItemsRaw);
        } catch {}
        itemsToSend = cartItems.map(item => {
          const original = originalItems.find(oi => oi.id === item.id);
          const normOrig = original ? normalizeCustomizationsForCompare(original.customizations) : undefined;
          const normCurr = normalizeCustomizationsForCompare(item.customizations);
          const isChanged = !original || JSON.stringify(normOrig) !== JSON.stringify(normCurr) || original.quantity !== item.quantity || original.price !== item.price;
          return isChanged ? { ...item, isUpdated: true } : { ...item, isUpdated: false };
        });
      }

      let orderData: any = {
        orderNumber: editingOrderId && location.state?.orderNumber ? location.state.orderNumber : generateOrderNumber(),
        customerInfo: {
          name: customer.name,
          phone: phone,
          ...(customer.email && { email: customer.email }),
          address: customer.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.postalCode}` : undefined,
        },
        items: itemsToSend.map(item => {
          const base: any = {
            id: item.id,
            baseId: item.baseId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            extraCharges: item.extraCharges || 0,
            imageUrl: item.imageUrl,
          };
          if (item.customizations) {
            const convertedCustomizations = convertInstructionsToNames(item.customizations);
            base.customizations = Object.fromEntries(
              Object.entries(convertedCustomizations).filter(([_, v]) => v !== undefined)
            );
          }
          return base;
        }),
        subtotal: subtotal,
        tax: tax,
        discount: discountAmount,
        total: total,
        orderType: (typeof orderType === 'string' && ['pickup','delivery','dine-in'].includes(orderType.toLowerCase()) ? orderType.toLowerCase() : 'pickup') as 'pickup' | 'delivery' | 'dine-in',
        paymentMethod: state.paymentMethod,
        paymentStatus: 'paid',
        createdAt: new Date().toISOString(),
        store: {
          id: currentStore.id,
          name: currentStore.name,
          address: currentStore.address,
        },
        discounts: [],
        discountTotal: 0,
        ...(orderType === 'delivery' && customer.address ? { deliveryDetails: { ...customer.address, ...(deliveryAddress || {}), ...(deliveryTimeType === 'scheduled' && scheduledDeliveryDateTime ? { scheduledDeliveryDateTime } : {}) } } : {}),
        ...(orderType === 'pickup' ? { pickupDetails: { estimatedTime: '15-25 minutes', ...(pickupTime === 'scheduled' && scheduledDateTime ? { scheduledDateTime } : {}) } } : {}),
        ...(state.orderNote.trim() && { orderNote: state.orderNote.trim() }),
        source: location.state?.originalOrder?.source || 'pos',
      };

      if (editingOrderId) {
        const updateData = deepRemoveUndefined(orderData);
        const orderRef = doc(db, 'orders', editingOrderId);
        await updateDoc(orderRef, updateData);
        updateState({ showOrderSuccess: true });
      } else {
        const cleanedOrderData = deepRemoveUndefined(orderData);
        await createOrder(cleanedOrderData);
        updateState({ showOrderSuccess: true });
      }

      clearCart();
      navigate('/customer-lookup');
    } catch (error) {
      console.error('Failed to create/update order:', error);
      alert('Failed to save order. Please try again.');
    } finally {
      updateState({ pendingOrder: false });
    }
  }, [state, navigate, clearCart, createOrder, customer, phone, cartItems, total, subtotal, discountAmount, orderType, editingOrderId, currentStore, location.state, convertInstructionsToNames, deepRemoveUndefined, updateState]);

  // Helper functions
  const normalizeCustomizationsForCompare = useCallback((customizations: any): any => {
    if (
      customizations &&
      typeof customizations === 'object' &&
      !Array.isArray(customizations) &&
      Object.keys(customizations).every(k => !isNaN(Number(k)))
    ) {
      return Object.values(customizations);
    }
    return customizations;
  }, []);

  const diffOrderItems = useCallback((originalItems: any[], modifiedItems: any[]) => {
    const origMap = new Map(originalItems.map(item => [item.id, item]));
    const modMap = new Map(modifiedItems.map(item => [item.id, item]));
    const added = [];
    const removed = [];
    const updated = [];

    for (const modItem of modifiedItems) {
      const origItem = origMap.get(modItem.id);
      if (!origItem) {
        added.push({ ...modItem, isNew: true });
      } else {
        const normOrig = normalizeCustomizationsForCompare(origItem.customizations);
        const normMod = normalizeCustomizationsForCompare(modItem.customizations);
        if (
          origItem.quantity !== modItem.quantity ||
          origItem.price !== modItem.price ||
          JSON.stringify(normOrig) !== JSON.stringify(normMod)
        ) {
          updated.push({ ...modItem, isUpdated: true });
        }
      }
    }
    
    for (const origItem of originalItems) {
      if (!modMap.has(origItem.id)) {
        removed.push({ ...origItem, isRemoved: true });
      }
    }
    
    return { added, removed, updated };
  }, [normalizeCustomizationsForCompare]);

  // Receipt generation
  const generateModifiedReceipt = useCallback((modificationType?: 'full' | 'modified') => {
    if (!customer || !customer.name) {
      console.error('Cannot generate receipt: customer data missing');
      return;
    }

    if (editingOrderId) {
      const originalItemsRaw = localStorage.getItem('originalOrderItems');
      let originalItems: any[] = [];
      try {
        if (originalItemsRaw) originalItems = JSON.parse(originalItemsRaw);
      } catch {}
      const itemsToSend = cartItems.map(item => {
        const original = originalItems.find(oi => oi.id === item.id);
        const normOrig = original ? normalizeCustomizationsForCompare(original.customizations) : undefined;
        const normCurr = normalizeCustomizationsForCompare(item.customizations);
        const isChanged = !original || JSON.stringify(normOrig) !== JSON.stringify(normCurr) || original.quantity !== item.quantity || original.price !== item.price;
        return isChanged ? { ...item, isUpdated: true } : { ...item, isUpdated: false };
      });

      if (modificationType === 'modified') {
        const modifiedItems = (itemsToSend as any[]).filter(item => item.isUpdated);
        let removedItems: any[] = [];
        try {
          const originalItemsRaw = localStorage.getItem('originalOrderItems');
          if (originalItemsRaw) {
            const originalItems = JSON.parse(originalItemsRaw);
            removedItems = originalItems.filter((orig: any) => !itemsToSend.some((curr: any) => curr.id === orig.id))
              .map((item: any) => ({ id: item.id, name: item.name, action: 'removed', price: item.price, quantity: item.quantity }));
          }
        } catch {}
        modifiedItemsRef.current = [...modifiedItems, ...removedItems];
      }
    }
  }, [cartItems, customer, editingOrderId, normalizeCustomizationsForCompare]);

  // Handler for modal choice (just sets state) - DEPRECATED: Now using direct update
  const handleModificationPromptChoice = useCallback((choice: 'full' | 'modified') => {
    updateState({ showModificationPrompt: false });
    handleCompleteOrder(choice);
  }, [handleCompleteOrder, updateState]);

  // On Complete Order button click
  const handleCompleteOrderClick = useCallback(() => {
    if (editingOrderId) {
      updateState({ showModificationPrompt: true });
    } else {
      handleCompleteOrder();
    }
  }, [editingOrderId, handleCompleteOrder, updateState]);

  // Return all the necessary data and functions
  return {
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
    deliveryCharge: state.deliveryCharge,
    deliveryChargeDetails: state.deliveryChargeDetails,
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
    normalizeCustomizationsForCompare,
    diffOrderItems,
    deepRemoveUndefined,
    
    // Refs
    modifiedItemsRef,
    
    // Firebase data
    pizzaInstructionTiles,
    wingInstructionTiles,
  };
};
