import { Order } from './types';

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

function renderComboStep(step: any, idx: number) {
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
    lines.push(`    Instructions: ${step.instructions.join(', ')}`);
  }
  // Extra charge
  if (step.extraCharge && Number(step.extraCharge) > 0) {
    lines.push(`    Extra Charge: +$${Number(step.extraCharge).toFixed(2)}`);
  }
  return lines;
}

function isComboCustomizations(customizations: any): boolean {
  if (!customizations || Array.isArray(customizations)) return false;
  const keys = Object.keys(customizations);
  return keys.length > 0 && keys.every(k => !isNaN(Number(k)));
}

export function renderReceipt(
  order: Order,
  type: 'new' | 'reprint' | 'modified-partial' | 'modified-full',
  opts?: {
    logoLines?: string[];
    showAddress?: boolean;
    modifiedDeltas?: Array<{ name: string; change: '+' | '-' | '~'; details?: string }>;
  }
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
        const steps = Object.keys(item.customizations)
          .sort((a, b) => Number(a) - Number(b))
          .map(k => item.customizations[k]);
        steps.forEach((step: any, idx: number) => {
          lines.push(...renderComboStep(step, idx));
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
          lines.push(`  Instructions: ${item.customizations.instructions.join(', ')}`);
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