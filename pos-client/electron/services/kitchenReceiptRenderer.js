export class KitchenReceiptRenderer {
  constructor() {
    // Initialize any necessary properties
  }

  // Receipt rendering functions
  renderToppingsBySide(toppings, indent = '  ') {
    const lines = [];
    if (!toppings) return lines;
    
    // Show whole pizza toppings (each on a new line)
    if (toppings.wholePizza && toppings.wholePizza.length > 0) {
      toppings.wholePizza.forEach(topping => {
        lines.push(`${indent}${topping.name}`);
      });
    }
    
    // Show left side toppings
    if (toppings.leftSide && toppings.leftSide.length > 0) {
      lines.push(`${indent}Left`);
      toppings.leftSide.forEach(topping => {
        lines.push(`${indent}  ${topping.name}`);
      });
    }
    
    // Show right side toppings
    if (toppings.rightSide && toppings.rightSide.length > 0) {
      lines.push(`${indent}Right`);
      toppings.rightSide.forEach(topping => {
        lines.push(`${indent}  ${topping.name}`);
      });
    }
    
    return lines;
  }

  renderComboStep(step, idx, pizzaCount = 0) {
    const lines = [];
    
    // Handle dipping sauces specially
    if (step.type === 'dipping' && step.selectedDippingSauces && step.sauceData) {
      // Show individual dipping sauce items
      Object.entries(step.selectedDippingSauces).forEach(([sauceId, quantity]) => {
        const sauceName = step.sauceData[sauceId]?.name || 'Dipping Sauce';
        lines.push(`  - ${quantity}x ${sauceName}`);
      });
    } else {
      // Simplified step display - just show the type without redundant information
      let label;
      if (step.type === 'pizza') {
        const currentPizzaCount = pizzaCount + 1;
        label = `Pizza ${currentPizzaCount}`;
      } else if (step.type === 'wings') {
        label = 'Wings';
      } else if (step.type === 'side') {
        label = 'Side';
      } else if (step.type === 'drink') {
        label = 'Drink';
      } else if (step.type === 'dipping') {
        label = 'Dipping Sauce';
      } else {
        label = step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : `Item ${idx + 1}`;
      }
      if (step.size) label += ` (${step.size})`;
      lines.push(`  - ${label}`);
      // Toppings (pizza)
      if (step.toppings && (step.toppings.wholePizza || step.toppings.leftSide || step.toppings.rightSide)) {
        //lines.push('    Toppings');
        lines.push(...this.renderToppingsBySide(step.toppings, '      '));
      }
      // Half & Half
      if (step.isHalfAndHalf) {
        //lines.push('    Half & Half Pizza');
      }
      // Sauces (wings)
      if (step.sauces && step.sauces.length > 0) {
        const sauceNames = step.sauces.map(s => s.name).filter(name => name);
        if (sauceNames.length > 0) {
          //lines.push(`    Sauces`);
          sauceNames.forEach(sauce => {
            lines.push(`      ${sauce}`);
          });
        }
      }
      // Instructions
      if (step.instructions && step.instructions.length > 0) {
        lines.push(`    Instructions: ${step.instructions.join(', ')}`);
      }
      // NOTE: No extra charge for kitchen receipt
    }
    return lines;
  }

  isComboCustomizations(customizations) {
    if (!customizations || Array.isArray(customizations)) return false;
    const keys = Object.keys(customizations);
    return keys.length > 0 && keys.every(k => !isNaN(Number(k)));
  }

  renderKitchenReceipt(order, type) {
    // DEBUG: Log the full order object to troubleshoot combo rendering
    console.log('DEBUG KITCHEN RECEIPT ORDER:', JSON.stringify(order, null, 2));
    const lines = [];
    
    // Kitchen header - simplified
    lines.push('*** KITCHEN COPY ***');
    if (order.storeName) lines.push(order.storeName);
    lines.push('-----------------------------');
    
    // Order type
    if (order.orderType) {
      const orderTypeText = order.orderType === 'delivery' ? 'DELIVERY ORDER' : 'PICKUP ORDER';
      lines.push(orderTypeText);
    }
    
    // Order information - more compact
    if (order.orderNumber) lines.push(`Order #: ${order.orderNumber}`);
    if (order.orderDate) {
      const date = new Date(order.orderDate);
      lines.push(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    }
    
    // Scheduled order information for kitchen timing
    if (order.scheduledTime) {
      const scheduledDate = new Date(order.scheduledTime);
      lines.push(`Scheduled: ${scheduledDate.toLocaleDateString()} ${scheduledDate.toLocaleTimeString()}`);
    }
    
    // Customer info - important for kitchen to know who the order is for
    if (order.customerInfo?.name) lines.push(`Customer: ${order.customerInfo.name}`);
    
    // Add order note if present - important for kitchen
    if (order.orderNote) {
      lines.push('-----------------------------');
      lines.push('ORDER NOTE:');
      lines.push(order.orderNote);
    }
    
    // Pickup/Delivery details - important for kitchen timing
    if (order.orderType === 'pickup') {
      if (order.pickupDetails && order.pickupDetails.scheduledDateTime) {
        const scheduledDate = new Date(order.pickupDetails.scheduledDateTime);
        lines.push(`Pickup: ${scheduledDate.toLocaleString()}`);
      } else {
        lines.push(`Pickup: ASAP`);
      }
    } else if (order.orderType === 'delivery') {
      if (order.deliveryDetails && order.deliveryDetails.scheduledDeliveryDateTime) {
        const scheduledDate = new Date(order.deliveryDetails.scheduledDeliveryDateTime);
        lines.push(`Scheduled Delivery: ${scheduledDate.toLocaleString()}`);
      } else {
        lines.push(`Delivery Time: ASAP`);
      }
    }
    
    lines.push('-----------------------------');

    // Receipt type handling - kitchen doesn't need partial modification view
    if (type === 'modified-partial') {
      lines.push('ORDER MODIFICATION - KITCHEN');
      lines.push('-----------------------------');
      // Show all items for kitchen, not just changes
    }
    
    // Items - show all items for kitchen
    if (order.items && order.items.length > 0) {
      lines.push('ITEMS:');
      order.items.forEach((item, itemIdx) => {
        // Check if it's a combo by looking for combo customizations (numbered keys)
        if (item.type === 'combo' || (item.customizations && this.isComboCustomizations(item.customizations))) {
          this.renderComboItemForKitchen(lines, item);
        } else {
          this.renderRegularItemForKitchen(lines, item);
        }
        
        // Add spacing between items (except for the last item)
        if (itemIdx < order.items.length - 1) {
          lines.push('');
        }
      });
    }
    
    // NOTE: No totals section for kitchen receipt
    
    // Footer - simplified for kitchen
    lines.push('-----------------------------');
    lines.push('*** KITCHEN COPY ***');
    lines.push(`Prepared at: ${new Date().toLocaleString()}`);
    
    return lines;
  }

  renderComboItemForKitchen(lines, combo) {
    // Show quantity and name only (no price)
    lines.push(`${combo.quantity}x ${combo.name}`);
    
    if (combo.customizations) {
      const customizations = combo.customizations;
      
      // Handle combo customizations (array format - like what modified receipt uses)
      if (Array.isArray(customizations)) {
        let pizzaCount = 0;
        customizations.forEach((step, idx) => {
          const stepLines = this.renderComboStep(step, idx, pizzaCount);
          if (Array.isArray(stepLines)) {
            lines.push(...stepLines);
          }
          if (step.type === 'pizza') pizzaCount++;
        });
      }
      // Handle combo customizations (object with numeric keys)
      else if (this.isComboCustomizations(customizations)) {
        // Sort the keys numerically and render each step
        const steps = Object.keys(customizations)
          .sort((a, b) => Number(a) - Number(b))
          .map(k => customizations[k]);
        
        let pizzaCount = 0;
        steps.forEach((step, idx) => {
          const stepLines = this.renderComboStep(step, idx, pizzaCount);
          if (Array.isArray(stepLines)) {
            lines.push(...stepLines);
          }
          if (step.type === 'pizza') pizzaCount++;
        });
      } else {
        // Handle regular customizations (array)
        customizations.forEach(customization => {
          if (customization.name && customization.selectedOption) {
            lines.push(`  ${customization.name}: ${customization.selectedOption}`);
          }
        });
      }
    }
    
    // NOTE: No extra charges for kitchen receipt
  }

  renderRegularItemForKitchen(lines, item) {
    // Show quantity and name only (no price)
    lines.push(`${item.quantity}x ${item.name}`);
    
    // Handle customizations (nested structure)
    if (item.customizations) {
      // Size
      if (item.customizations.size) {
        lines.push(`  Size: ${item.customizations.size}`);
      }
      
      // Pizza toppings - use the same nice formatting as renderComboStep
      if (item.customizations.toppings) {
        const toppings = item.customizations.toppings;
        if (toppings.wholePizza || toppings.leftSide || toppings.rightSide) {
          //lines.push(`  Toppings`);
          const toppingLines = this.renderToppingsBySide(toppings, '    ');
          if (Array.isArray(toppingLines)) {
            lines.push(...toppingLines);
          }
        }
      }
      
      // Half and half indicator
      if (item.customizations.isHalfAndHalf) {
        //lines.push(`  Half & Half Pizza`);
      }
      
      // Wing sauces
      if (item.customizations.sauces && item.customizations.sauces.length > 0) {
        const sauceNames = item.customizations.sauces
          .map(s => s.name || s)
          .filter(name => name && name !== '' && name !== 0 && name !== '0');
        if (sauceNames.length > 0) {
          //lines.push(`  Sauces`);
          sauceNames.forEach(sauce => {
            lines.push(`    ${sauce}`);
          });
        }
      }
      
      // Instructions
      if (item.customizations.instructions && item.customizations.instructions.length > 0) {
        const instructionLabels = item.customizations.instructions
          .map(instruction => instruction.name || instruction)
          .filter(label => label && label !== '' && label !== 0 && label !== '0');
        if (instructionLabels.length > 0) {
          lines.push(`  Instructions: ${instructionLabels.join(', ')}`);
        }
      }
      
      // Handle combo arrays (for combo customizations)
      if (Array.isArray(item.customizations)) {
        const typeOrder = { pizza: 1, wings: 2, side: 3, drink: 4 };
        const sortedCustomizations = [...item.customizations].sort((a, b) => 
          (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5)
        );
        
        let pizzaCount = 0;
        sortedCustomizations.forEach((step, idx) => {
          let stepLabel = '';
          if (step.type === 'pizza') {
            stepLabel = `Pizza ${++pizzaCount}${step.isHalfAndHalf ? ' (Half & Half)' : ''}${step.size ? ` (${step.size})` : ''}`;
          } else if (step.type === 'wings') {
            stepLabel = `Wings${step.size ? ` (${step.size})` : ''}`;
          } else if (step.type === 'side') {
            stepLabel = `Side${step.size ? ` (${step.size})` : ''}`;
          } else if (step.type === 'drink') {
            stepLabel = `Drink${step.size ? ` (${step.size})` : ''}`;
          } else {
            stepLabel = step.itemName || `Item ${idx + 1}`;
          }
          lines.push(`  ${stepLabel}`);
          
          // Toppings for combo items - use the same nice formatting
          if (step.toppings && (step.toppings.wholePizza || step.toppings.leftSide || step.toppings.rightSide)) {
            //lines.push(`    Toppings`);
            const toppingLines = this.renderToppingsBySide(step.toppings, '      ');
            if (Array.isArray(toppingLines)) {
              lines.push(...toppingLines);
            }
          }
          
          // Sauces for combo items
          if (step.sauces && step.sauces.length > 0) {
            const sauceNames = step.sauces.map(s => s.name || s).filter(name => name);
            if (sauceNames.length > 0) {
              //lines.push(`    Sauces`);
              sauceNames.forEach(sauce => {
                lines.push(`      ${sauce}`);
              });
            }
          }
          
          // Instructions for combo items
          if (step.instructions && step.instructions.length > 0) {
            const instructionLabels = step.instructions.map(instruction => instruction.name || instruction).filter(label => label);
            if (instructionLabels.length > 0) {
              lines.push(`    Instructions: ${instructionLabels.join(', ')}`);
            }
          }
          
          // NOTE: No extra charges for kitchen receipt
        });
      }
    }
    
    // NOTE: No extra charges for kitchen receipt
  }
}
