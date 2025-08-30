import { Order } from './types';

interface InstructionTile {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface RenderKitchenReceiptOptions {
  logoLines?: string[];
  showAddress?: boolean;
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

function renderComboStep(step: any, idx: number, opts?: RenderKitchenReceiptOptions, pizzaCount?: number) {
  const lines: string[] = [];
  // Simplified step display - just show the type without redundant information
  let label;
  if (step.type === 'pizza') {
    const currentPizzaCount = (pizzaCount || 0) + 1;
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
  // NOTE: No extra charge information for kitchen receipt
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

export function renderKitchenReceipt(
  order: Order,
  type: 'new' | 'reprint' | 'modified-partial' | 'modified-full',
  opts?: RenderKitchenReceiptOptions
): string[] {
  const lines: string[] = [];
  
  // Kitchen header - simplified
  lines.push('*** KITCHEN COPY ***');
  lines.push(order.storeName);
  lines.push('-----------------------------');
  lines.push(`Order Type: ${order['orderType'] || 'Pickup'}`);
  lines.push(`Order #: ${order.orderNumber || order.id || ''}`);
  lines.push(`Date/Time: ${formatDateTime(order.createdAt)}`);
  
  // Add scheduled order information for kitchen timing
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
  
  // Add order note if present - important for kitchen
  if (order['orderNote']) {
    lines.push('-----------------------------');
    lines.push('Order Note:');
    lines.push(order['orderNote']);
  }
  lines.push('-----------------------------');
  
  if (type === 'reprint') lines.push('*** REPRINT ***');
  if (type.startsWith('modified')) lines.push('*** MODIFIED ORDER ***');
  lines.push('-----------------------------');
  
  // Kitchen doesn't need modified-partial view, always show all items
  order.items.forEach(item => {
    // Show quantity and item name only (no prices)
    lines.push(`${item.quantity}x ${item.name}`);
    
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
      let pizzaCount = 0;
      steps.forEach((step: any, idx: number) => {
        lines.push(...renderComboStep(step, idx, opts, pizzaCount));
        if (step.type === 'pizza') pizzaCount++;
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
    // NOTE: No extra charges shown for kitchen receipt
  });
  
  lines.push('-----------------------------');
  // NOTE: No pricing information for kitchen receipt
  
  // Footer - simplified for kitchen
  lines.push('*** KITCHEN COPY ***');
  lines.push(`Prepared at: ${new Date().toLocaleString()}`);
  
  return lines;
}
