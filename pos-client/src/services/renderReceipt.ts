import { Order } from './types';

interface InstructionTile {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface RenderReceiptOptions {
  logoLines?: string[];
  showAddress?: boolean;
  modifiedDeltas?: Array<{ name: string; change: '+' | '-' | '~'; details?: string }>;
  pizzaInstructionTiles?: InstructionTile[];
  wingInstructionTiles?: InstructionTile[];
}

// Helper function to convert instruction IDs to names
function convertInstructionIdsToNames(
  instructionIds: string[],
  instructionTiles: InstructionTile[] | undefined
): string[] {
  if (!instructionTiles) return instructionIds;
  
  return instructionIds.map(id => {
    const tile = instructionTiles.find(t => t.id === id && t.isActive);
    return tile ? tile.label : id;
  });
}

function formatDateTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function renderToppingsBySide(toppings: any, indent = '    ') {
  const lines: string[] = [];
  if (!toppings) return lines;
  if (toppings.wholePizza && toppings.wholePizza.length > 0) {
    lines.push(`${indent}Whole: ${toppings.wholePizza.map((t: any) => t.name || t).join(', ')}`);
  }
  if (toppings.leftSide && toppings.leftSide.length > 0) {
    lines.push(`${indent}Left: ${toppings.leftSide.map((t: any) => t.name || t).join(', ')}`);
  }
  if (toppings.rightSide && toppings.rightSide.length > 0) {
    lines.push(`${indent}Right: ${toppings.rightSide.map((t: any) => t.name || t).join(', ')}`);
  }
  return lines;
}

function renderComboStep(step: any, idx: number, opts?: RenderReceiptOptions) {
  const lines: string[] = [];
  let label = step.itemName || (step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : `Item ${idx + 1}`);
  if (step.size) label += ` (${step.size})`;
  lines.push(`  - ${label}`);
  // Toppings (pizza)
  if (step.toppings && (step.toppings.wholePizza || step.toppings.leftSide || step.toppings.rightSide)) {
    lines.push('    Toppings:');
    lines.push(...renderToppingsBySide(step.toppings, '      '));
  }
  // Half & Half
  if (step.isHalfAndHalf) {
    lines.push('    Half & Half Pizza');
  }
  // Sauces (wings)
  if (step.sauces && step.sauces.length > 0) {
    lines.push(`    Sauces: ${step.sauces.map((s: any) => s.name || s).join(', ')}`);
  }
  // Instructions
  if (step.instructions && step.instructions.length > 0) {
    // Convert instruction IDs to names if instruction tiles are provided
    let instructionLabels = step.instructions;
    if (opts?.pizzaInstructionTiles || opts?.wingInstructionTiles) {
      // Determine which instruction tiles to use based on step type
      const isWings = step.type === 'wings';
      const instructionTiles = isWings ? opts.wingInstructionTiles : opts.pizzaInstructionTiles;
      instructionLabels = convertInstructionIdsToNames(step.instructions, instructionTiles);
    }
    lines.push(`    Instructions: ${instructionLabels.join(', ')}`);
  }
  // Extra charge
  if (step.extraCharge && Number(step.extraCharge) > 0) {
    lines.push(`    Extra Charge: +$${Number(step.extraCharge).toFixed(2)}`);
  }
  return lines;
}

function isComboCustomizations(customizations: any): boolean {
  if (!customizations) return false;
  
  // Handle array format (from UnifiedComboSelector)
  if (Array.isArray(customizations)) {
    return customizations.length > 0 && customizations.every(step => step && typeof step === 'object' && step.type);
  }
  
  // Handle object format (legacy)
  const keys = Object.keys(customizations);
  return keys.length > 0 && keys.every(k => !isNaN(Number(k)));
}

export function renderReceipt(
  order: Order,
  type: 'new' | 'reprint' | 'modified-partial' | 'modified-full',
  opts?: RenderReceiptOptions
): string[] {
  const lines: string[] = [];
  if (opts?.logoLines) lines.push(...opts.logoLines);
  lines.push(order.storeName);
  if (opts?.showAddress && order['storeAddress']) lines.push(order['storeAddress']);
  if (order['storePhone']) lines.push(order['storePhone']);
  lines.push('-----------------------------');
  lines.push(`Order Type: ${order['orderType'] || 'Pickup'}`);
  lines.push(`Order #: ${order.orderNumber || order.id || ''}`);
  lines.push(`Date/Time: ${formatDateTime(order.createdAt)}`);
  
  // Add scheduled order information
  if (order['orderType'] === 'pickup') {
    if (order['pickupTime'] === 'scheduled' && order['scheduledDateTime']) {
      const scheduledDate = new Date(order['scheduledDateTime']);
      lines.push(`Scheduled Pickup: ${scheduledDate.toLocaleString()}`);
    } else {
      lines.push(`Pickup Time: ASAP (${order['estimatedPickupTime'] || '15-25 minutes'})`);
    }
  } else if (order['orderType'] === 'delivery') {
    if (order['deliveryTimeType'] === 'scheduled' && order['scheduledDeliveryDateTime']) {
      const scheduledDate = new Date(order['scheduledDeliveryDateTime']);
      lines.push(`Scheduled Delivery: ${scheduledDate.toLocaleString()}`);
    } else {
      lines.push(`Delivery Time: ASAP`);
    }
  }
  
  lines.push('-----------------------------');
  lines.push(`Customer: ${order.customerInfo.name}`);
  lines.push(`Phone:    ${order.customerInfo.phone}`);
  if (order['deliveryAddress']) lines.push(`Address:  ${order['deliveryAddress']}`);
  lines.push('-----------------------------');
  if (type === 'reprint') lines.push('*** REPRINT ***');
  if (type.startsWith('modified')) lines.push('*** MODIFIED ORDER ***');
  lines.push('-----------------------------');
  if (type === 'modified-partial' && opts?.modifiedDeltas) {
    lines.push('Modified Items:');
    opts.modifiedDeltas.forEach(delta => {
      let flag = delta.change === '+' ? '+' : delta.change === '-' ? '-' : '~';
      lines.push(` ${flag} ${delta.name}${delta.details ? ' ' + delta.details : ''}`);
    });
  } else {
    order.items.forEach(item => {
      lines.push(`${item.quantity}x ${item.name} $${item.price.toFixed(2)}`);
      // Combo breakdown
      if (isComboCustomizations(item.customizations)) {
        let steps: any[] = [];
        // Handle both array format (from UnifiedComboSelector) and object format (legacy)
        if (Array.isArray(item.customizations)) {
          steps = item.customizations;
        } else {
          steps = Object.keys(item.customizations)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => item.customizations[k]);
        }
        steps.forEach((step: any, idx: number) => {
          lines.push(...renderComboStep(step, idx, opts));
        });
      } else if (item.customizations) {
        // Size
        if (item.customizations.size) {
          lines.push(`  Size: ${item.customizations.size}`);
        }
        // Toppings (with sides)
        if (item.customizations.toppings && (item.customizations.toppings.wholePizza || item.customizations.toppings.leftSide || item.customizations.toppings.rightSide)) {
          lines.push('  Toppings:');
          lines.push(...renderToppingsBySide(item.customizations.toppings, '    '));
        }
        // Half & Half
        if (item.customizations.isHalfAndHalf) {
          lines.push('  Half & Half Pizza');
        }
        // Sauces
        if (item.customizations.sauces && item.customizations.sauces.length > 0) {
          lines.push(`  Sauces: ${item.customizations.sauces.map((s: any) => s.name || s).join(', ')}`);
        }
        // Instructions
        if (item.customizations.instructions && item.customizations.instructions.length > 0) {
          // Convert instruction IDs to names if instruction tiles are provided
          let instructionLabels = item.customizations.instructions;
          if (opts?.pizzaInstructionTiles || opts?.wingInstructionTiles) {
            // Determine which instruction tiles to use based on item type
            const isWings = item.name.toLowerCase().includes('wing') || 
                           (item.customizations && item.customizations.type === 'wings');
            const instructionTiles = isWings ? opts.wingInstructionTiles : opts.pizzaInstructionTiles;
            instructionLabels = convertInstructionIdsToNames(item.customizations.instructions, instructionTiles);
          }
          lines.push(`  Instructions: ${instructionLabels.join(', ')}`);
        }
      }
      // Extra charges (always show if present)
      if (item.extraCharges && item.extraCharges > 0) {
        lines.push(`  Extra Charge: +$${item.extraCharges.toFixed(2)}`);
      }
    });
  }
  lines.push('-----------------------------');
  if (order['subtotal'] !== undefined) lines.push(`Subtotal:   $${order['subtotal'].toFixed(2)}`);
  if (order['tax'] !== undefined) lines.push(`Tax:        $${order['tax'].toFixed(2)}`);
  lines.push(`Total:      $${order.total.toFixed(2)}`);
  lines.push('-----------------------------');
  if (order['paymentMethod']) lines.push(`Payment: ${order['paymentMethod']}`);
  lines.push('-----------------------------');
  lines.push('Thank you for your order!');
  lines.push('Follow us @RightWingers');
  return lines;
} 