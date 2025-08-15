import React, { memo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getPizzaInstructionLabels, getWingInstructionLabels } from '../../utils/cartHelpers';
import { CartItem } from '../../hooks/useCheckout';

interface OrderSummaryProps {
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export const OrderSummary = memo(({ 
  cartItems, 
  subtotal, 
  tax, 
  discount, 
  total 
}: OrderSummaryProps) => {
  // Fetch instruction tiles for converting IDs to labels
  const [pizzaInstructionTiles] = useCollection(
    query(collection(db, 'pizzaInstructions'), orderBy('sortOrder'))
  );
  const [wingInstructionTiles] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );

  const formatCustomizations = (item: CartItem) => {
    if (!item.customizations) return null;
    
    const details = [];
    
    // Size
    if (item.customizations.size) {
      details.push(`Size: ${item.customizations.size}`);
    }
    
    // Pizza toppings
    if (item.customizations.toppings) {
      const toppings: string[] = [];
      
      const processToppings = (side: string, toppingArray: any[]) => {
        if (toppingArray && toppingArray.length > 0) {
          const toppingNames = toppingArray
            .map((t: any) => t.name || t)
            .filter((name: any) => name && name !== '' && String(name) !== '0');
          if (toppingNames.length > 0) {
            toppings.push(`${side}: ${toppingNames.join(', ')}`);
          }
        }
      };

      // Process each side's toppings
      if (item.customizations.toppings.wholePizza) {
        processToppings('Whole', item.customizations.toppings.wholePizza);
      }
      if (item.customizations.toppings.leftSide) {
        processToppings('Left', item.customizations.toppings.leftSide);
      }
      if (item.customizations.toppings.rightSide) {
        processToppings('Right', item.customizations.toppings.rightSide);
      }
      
      if (toppings.length > 0) {
        toppings.forEach(topping => details.push(`${topping}`));
      }
    }
    
    // Wing sauces
    if (item.customizations.sauces && item.customizations.sauces.length > 0) {
      const sauceNames = item.customizations.sauces
        .map((s: any) => s.name || s)
        .filter((name: any) => name && name !== '' && name !== 0 && name !== '0');
      if (sauceNames.length > 0) {
        details.push(`Sauces: ${sauceNames.join(', ')}`);
      }
    }
    
    // Instructions
    if (item.customizations.instructions && item.customizations.instructions.length > 0) {
      let instructionLabels: string[] = [];
      if (item.customizations.type === 'wings') {
        instructionLabels = getWingInstructionLabels(wingInstructionTiles, item.customizations.instructions);
      } else {
        instructionLabels = getPizzaInstructionLabels(pizzaInstructionTiles, item.customizations.instructions);
      }
      if (instructionLabels.length > 0) {
        details.push(`Instructions: ${instructionLabels.join(', ')}`);
      }
    }
    
    // Handle combo arrays
    if (Array.isArray(item.customizations)) {
      const typeOrder = { pizza: 1, wings: 2, side: 3, drink: 4, dipping: 5 };
      const sortedCustomizations = [...item.customizations].sort((a, b) => 
        (typeOrder[a.type as keyof typeof typeOrder] || 5) - (typeOrder[b.type as keyof typeof typeOrder] || 5)
      );
      let pizzaCount = 0;
      sortedCustomizations.forEach((step, idx) => {
        let stepLabel = '';
        if (step.type === 'pizza') {
          stepLabel = `Pizza ${++pizzaCount}${step.isHalfAndHalf ? ' (Half & Half)' : ''}${step.size ? ` (${step.size})` : ''}`;
        } else if (step.type === 'wings') {
          stepLabel = `Wings${step.size ? ` (${step.size})` : ''}`;
        } else if (step.type === 'side') {
          stepLabel = `${step.itemName || 'Side'}${step.size ? ` (${step.size})` : ''}`;
        } else if (step.type === 'drink') {
          stepLabel = `${step.itemName || 'Drink'}${step.size ? ` (${step.size})` : ''}`;
        } else if (step.type === 'dipping') {
          if (step.selectedDippingSauces && step.sauceData) {
            const dippingItems = Object.entries(step.selectedDippingSauces).map(([sauceId, quantity]: [string, any]) => {
              const sauceName = step.sauceData[sauceId]?.name || 'Dipping Sauce';
              return `${quantity}x ${sauceName}`;
            });
            stepLabel = dippingItems.join(', ');
          } else {
            stepLabel = `${step.itemName || 'Dipping Sauce'}${step.size ? ` (${step.size})` : ''}`;
          }
        } else {
          stepLabel = step.itemName || `Item ${idx + 1}`;
        }
        details.push(stepLabel);
        
        // Toppings
        if (step.toppings && step.toppings.wholePizza && step.toppings.wholePizza.length > 0) {
          details.push(`  Whole: ${step.toppings.wholePizza.map((t: any) => t.name).join(', ')}`);
        }
        if (step.toppings && step.toppings.leftSide && step.toppings.leftSide.length > 0) {
          details.push(`  Left: ${step.toppings.leftSide.map((t: any) => t.name).join(', ')}`);
        }
        if (step.toppings && step.toppings.rightSide && step.toppings.rightSide.length > 0) {
          details.push(`  Right: ${step.toppings.rightSide.map((t: any) => t.name).join(', ')}`);
        }
        
        // Sauces
        if (step.sauces && step.sauces.length > 0) {
          details.push(`  Sauces: ${step.sauces.map((s: any) => s.name).join(', ')}`);
        }
        
        // Instructions for each combo step
        if (step.instructions && step.instructions.length > 0) {
          const instructionLabels = step.type === 'wings'
            ? getWingInstructionLabels(wingInstructionTiles, step.instructions)
            : getPizzaInstructionLabels(pizzaInstructionTiles, step.instructions);
          if (instructionLabels.length > 0) {
            details.push(`  Instructions: ${instructionLabels.join(', ')}`);
          }
        }
      });
    }
    
    const filteredDetails = details.filter(detail => detail != null && detail !== '' && String(detail).trim() !== '0');
    if (!Array.isArray(filteredDetails) || filteredDetails.length === 0) return [];
    return filteredDetails;
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Items List - Scrollable */}
      <div 
        className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0 cart-items-scroll" 
        style={{ 
          maxHeight: 'calc(100vh - 400px)'
        }}
      >
        {cartItems.map((item) => {
          const customizations = formatCustomizations(item);
          return (
            <div key={item.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-10 h-10 object-cover rounded-md flex-shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-900 text-xs">{item.name}</h4>
                    <p className="font-bold text-gray-900 ml-2 text-xs">
                      ${((item.price + (item.extraCharges || 0)) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">Quantity: {item.quantity}</p>
                  
                  {/* Detailed customizations */}
                  {Array.isArray(customizations) && customizations.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {customizations
                        .filter(detail => detail != null && detail !== '' && String(detail).trim() !== '0')
                        .map((detail, index) => {
                          const isIndented = detail.startsWith('  ');
                          const cleanDetail = detail.replace(/^  /, '');
                          
                          // Main step headers
                          if (!isIndented && !cleanDetail.includes(':') && !cleanDetail.startsWith('Extra Charge')) {
                            return (
                              <div key={index} className="text-xs font-semibold text-gray-800 mt-1.5 first:mt-0">
                                • {cleanDetail}
                              </div>
                            );
                          }
                          
                          // Topping details
                          if (cleanDetail.match(/^(Whole|Left|Right):/)) {
                            const [label, toppings] = cleanDetail.split(': ');
                            return (
                              <div key={index} className="text-xs text-gray-600 ml-4">
                                <span className="font-medium text-gray-700">{label}:</span> <span className="text-gray-600">{toppings}</span>
                              </div>
                            );
                          }
                          
                          // Sauces, Instructions, Size, etc.
                          if (cleanDetail.includes(':')) {
                            const [label, value] = cleanDetail.split(': ');
                            return (
                              <div key={index} className="text-xs text-gray-600 ml-4">
                                <span className="font-medium text-gray-700">{label}:</span> <span className="text-gray-600">{value}</span>
                              </div>
                            );
                          }
                          
                          // Skip individual step extra charges
                          if (cleanDetail.startsWith('Extra Charge:')) {
                            return null;
                          }
                          
                          // Handle "Toppings:" header - skip it as it's redundant
                          if (cleanDetail === 'Toppings:') {
                            return null;
                          }
                          
                          // Other details
                          return (
                            <div key={index} className="text-xs text-gray-600 ml-4">
                              {cleanDetail}
                            </div>
                          );
                        })}
                    </div>
                  )}
                  
                  {/* Extra charges */}
                  {typeof item.extraCharges === 'number' && item.extraCharges > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Extra charges: +${item.extraCharges.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Totals - Fixed at bottom */}
      <div className="border-t pt-3 space-y-1 flex-shrink-0">
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-red-600 text-sm">
            <span>Discount:</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Tax (13%):</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
});

OrderSummary.displayName = 'OrderSummary';
