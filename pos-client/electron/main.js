import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import escpos from 'escpos';
import escposUSB from 'escpos-usb';

escpos.USB = escposUSB; // Attach USB to escpos

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

function getPrinterForStore(storeId) {
  const store = storeId.toLowerCase();

  if (store === 'oakville' || store === 'burlington') {
    try {
      const device = new escpos.USB();
      return new escpos.Printer(device);
    } catch (err) {
      console.warn(`USB Printer not found for ${store}:`, err);
      return null;
    }
  }

  if (store === 'hamilton') {
    const device = new escpos.Network('192.168.0.104');
    return new escpos.Printer(device);
  }

  if (store === 'stcatherine') {
    const device = new escpos.Network('192.168.0.115');
    return new escpos.Printer(device);
  }

  return null;
}

function renderToppingsBySide(toppings, indent = '    ') {
  const lines = [];
  if (!toppings) return lines;
  if (toppings.wholePizza && toppings.wholePizza.length > 0) {
    lines.push(`${indent}Whole: ${toppings.wholePizza.map(t => t.name).join(', ')}`);
  }
  if (toppings.leftSide && toppings.leftSide.length > 0) {
    lines.push(`${indent}Left: ${toppings.leftSide.map(t => t.name).join(', ')}`);
  }
  if (toppings.rightSide && toppings.rightSide.length > 0) {
    lines.push(`${indent}Right: ${toppings.rightSide.map(t => t.name).join(', ')}`);
  }
  return lines;
}

function renderComboStep(step, idx) {
  const lines = [];
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
    lines.push(`    Sauces: ${step.sauces.map(s => s.name).join(', ')}`);
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

function isComboCustomizations(customizations) {
  if (!customizations || Array.isArray(customizations)) return false;
  const keys = Object.keys(customizations);
  return keys.length > 0 && keys.every(k => !isNaN(Number(k)));
}

function renderReceipt(order, type) {
  // DEBUG: Log the full order object to troubleshoot combo rendering
  console.log('DEBUG RECEIVED ORDER:', JSON.stringify(order, null, 2));
  const lines = [];
  if (order.storeName) lines.push(order.storeName);
  if (order.storeAddress) lines.push(order.storeAddress);
  if (order.storePhone) lines.push(order.storePhone);
  lines.push('-----------------------------');
  lines.push(`Order #: ${order.orderNumber || 'N/A'}`);
  lines.push(`Customer: ${order.customerInfo?.name || ''}`);
  lines.push(`Phone: ${order.customerInfo?.phone || ''}`);
  
  // Add scheduled order information
  if (order.orderType === 'pickup') {
    if (order.pickupDetails && order.pickupDetails.scheduledDateTime) {
      const scheduledDate = new Date(order.pickupDetails.scheduledDateTime);
      lines.push(`Scheduled Pickup: ${scheduledDate.toLocaleString()}`);
    } else {
      lines.push(`Pickup Time: ASAP (${order.pickupDetails?.estimatedTime || '15-25 minutes'})`);
    }
  } else if (order.orderType === 'delivery') {
    if (order.deliveryDetails && order.deliveryDetails.scheduledDeliveryDateTime) {
      const scheduledDate = new Date(order.deliveryDetails.scheduledDeliveryDateTime);
      lines.push(`Scheduled Delivery: ${scheduledDate.toLocaleString()}`);
    } else {
      lines.push(`Delivery Time: ASAP`);
    }
    // Add delivery address for delivery orders
    if (order.deliveryDetails) {
      const address = order.deliveryDetails;
      if (address.street) {
        lines.push(`Delivery Address: ${address.street}`);
        if (address.city && address.postalCode) {
          lines.push(`                ${address.city}, ${address.postalCode}`);
        } else if (address.city) {
          lines.push(`                ${address.city}`);
        }
      }
    }
  }
  
  lines.push('-----------------------------');

  // --- Receipt type handling ---
  if (type === 'modified-partial') {
    lines.push('ORDER MODIFICATION RECEIPT');
    lines.push('-----------------------------');
    // Group items by action
    const added = order.items.filter(i => i.isNew);
    const removed = order.items.filter(i => i.isRemoved);
    const updated = order.items.filter(i => i.isUpdated && !i.isNew);
    if (added.length > 0) {
      lines.push('ADDED ITEMS:');
      added.forEach((item, itemIdx) => {
        lines.push(`${item.quantity}x ${item.name.toUpperCase()} $${item.price.toFixed(2)}`);
        if (item.size) lines.push(`  Size: ${item.size}`);
        // Render customizations as in normal receipt
        if (item.customizations) {
          if (Array.isArray(item.customizations)) {
            item.customizations.forEach((step, idx) => lines.push(...renderComboStep(step, idx)));
          } else if (isComboCustomizations(item.customizations)) {
            const steps = Object.keys(item.customizations)
              .sort((a, b) => Number(a) - Number(b))
              .map(k => item.customizations[k]);
            steps.forEach((step, idx) => lines.push(...renderComboStep(step, idx)));
          } else {
            if (item.customizations.size) lines.push(`  Size: ${item.customizations.size}`);
            if (item.customizations.toppings) {
              lines.push('  Toppings:');
              lines.push(...renderToppingsBySide(item.customizations.toppings, '    '));
            }
            if (item.customizations.isHalfAndHalf) lines.push('  Half & Half Pizza');
            if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) lines.push(`  Sauces: ${item.customizations.sauces.map(s => s.name).join(', ')}`);
            if (item.customizations.instructions && item.customizations.instructions.length > 0) lines.push(`  Instructions: ${item.customizations.instructions.join(', ')}`);
          }
        }
        if (item.extraCharges && item.extraCharges > 0) lines.push(`  Extra Charge: +$${item.extraCharges.toFixed(2)}`);
        if (itemIdx < added.length - 1) lines.push('');
      });
      lines.push('-----------------------------');
    }
    if (removed.length > 0) {
      lines.push('REMOVED ITEMS:');
      removed.forEach((item, itemIdx) => {
        lines.push(`${item.quantity}x ${item.name.toUpperCase()} $${item.price.toFixed(2)}  [REMOVED]`);
        if (item.size) lines.push(`  Size: ${item.size}`);
        // Render customizations as in normal receipt
        if (item.customizations) {
          if (Array.isArray(item.customizations)) {
            item.customizations.forEach((step, idx) => lines.push(...renderComboStep(step, idx)));
          } else if (isComboCustomizations(item.customizations)) {
            const steps = Object.keys(item.customizations)
              .sort((a, b) => Number(a) - Number(b))
              .map(k => item.customizations[k]);
            steps.forEach((step, idx) => lines.push(...renderComboStep(step, idx)));
          } else {
            if (item.customizations.size) lines.push(`  Size: ${item.customizations.size}`);
            if (item.customizations.toppings) {
              lines.push('  Toppings:');
              lines.push(...renderToppingsBySide(item.customizations.toppings, '    '));
            }
            if (item.customizations.isHalfAndHalf) lines.push('  Half & Half Pizza');
            if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) lines.push(`  Sauces: ${item.customizations.sauces.map(s => s.name).join(', ')}`);
            if (item.customizations.instructions && item.customizations.instructions.length > 0) lines.push(`  Instructions: ${item.customizations.instructions.join(', ')}`);
          }
        }
        if (item.extraCharges && item.extraCharges > 0) lines.push(`  Extra Charge: +$${item.extraCharges.toFixed(2)}`);
        if (itemIdx < removed.length - 1) lines.push('');
      });
      lines.push('-----------------------------');
    }
    if (updated.length > 0) {
      lines.push('MODIFIED ITEMS:');
      updated.forEach((item, itemIdx) => {
        lines.push(`${item.quantity}x ${item.name.toUpperCase()} $${item.price.toFixed(2)}  [MODIFIED]`);
        if (item.size) lines.push(`  Size: ${item.size}`);
        // Render customizations as in normal receipt
        if (item.customizations) {
          if (Array.isArray(item.customizations)) {
            item.customizations.forEach((step, idx) => lines.push(...renderComboStep(step, idx)));
          } else if (isComboCustomizations(item.customizations)) {
            const steps = Object.keys(item.customizations)
              .sort((a, b) => Number(a) - Number(b))
              .map(k => item.customizations[k]);
            steps.forEach((step, idx) => lines.push(...renderComboStep(step, idx)));
          } else {
            if (item.customizations.size) lines.push(`  Size: ${item.customizations.size}`);
            if (item.customizations.toppings) {
              lines.push('  Toppings:');
              lines.push(...renderToppingsBySide(item.customizations.toppings, '    '));
            }
            if (item.customizations.isHalfAndHalf) lines.push('  Half & Half Pizza');
            if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) lines.push(`  Sauces: ${item.customizations.sauces.map(s => s.name).join(', ')}`);
            if (item.customizations.instructions && item.customizations.instructions.length > 0) lines.push(`  Instructions: ${item.customizations.instructions.join(', ')}`);
          }
        }
        if (item.extraCharges && item.extraCharges > 0) lines.push(`  Extra Charge: +$${item.extraCharges.toFixed(2)}`);
        if (itemIdx < updated.length - 1) lines.push('');
      });
      lines.push('-----------------------------');
    }
    if (added.length === 0 && removed.length === 0 && updated.length === 0) {
      lines.push('No changes detected.');
      lines.push('-----------------------------');
    }
    lines.push('Thank you for your order!');
    return lines;
  }

  // Default: new or modified-full (render all items)
  order.items.forEach((item, itemIdx) => {
    // Main item name in ALL CAPS and marked for bold
    let itemLine = `${item.quantity}x ${item.name.toUpperCase()} $${item.price.toFixed(2)}`;
    lines.push(itemLine);
    // Size (if present)
    if (item.size) lines.push(`  Size: ${item.size}`);
    // --- Handle combo customizations (array or object with numeric keys) ---
    if (Array.isArray(item.customizations)) {
      item.customizations.forEach((step, idx) => {
        // Only show type (capitalized)
        let label = step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : `Item ${idx + 1}`;
        if (step.size) label += ` (${step.size})`;
        lines.push(`  - ${label}`);
        // Toppings (pizza)
        if (step.toppings && (step.toppings.wholePizza || step.toppings.leftSide || step.toppings.rightSide)) {
          lines.push('    Toppings:');
          if (step.toppings.wholePizza && step.toppings.wholePizza.length > 0)
            lines.push('      Whole: ' + step.toppings.wholePizza.map(t => t.name).join(', '));
          if (step.toppings.leftSide && step.toppings.leftSide.length > 0)
            lines.push('      Left: ' + step.toppings.leftSide.map(t => t.name).join(', '));
          if (step.toppings.rightSide && step.toppings.rightSide.length > 0)
            lines.push('      Right: ' + step.toppings.rightSide.map(t => t.name).join(', '));
        }
        // Half & Half
        if (step.isHalfAndHalf) {
          lines.push('    Half & Half Pizza');
        }
        // Sauces (wings)
        if (step.sauces && step.sauces.length > 0) {
          lines.push('    Sauces: ' + step.sauces.map(s => s.name).join(', '));
        }
        // Instructions
        if (step.instructions && step.instructions.length > 0) {
          lines.push('    Instructions: ' + step.instructions.join(', '));
        }
        // Extra charge for sub-item
        if (step.extraCharge && Number(step.extraCharge) > 0) {
          lines.push('    Extra Charge: +$' + Number(step.extraCharge).toFixed(2));
        }
      });
      // Extra charge for the combo itself
      if (item.extraCharges && item.extraCharges > 0) {
        lines.push(`  Extra Charge: +$${item.extraCharges.toFixed(2)}`);
      }
    } else if (isComboCustomizations(item.customizations)) {
      const steps = Object.keys(item.customizations)
        .sort((a, b) => Number(a) - Number(b))
        .map(k => item.customizations[k]);
      steps.forEach((step, idx) => {
        let label = step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : `Item ${idx + 1}`;
        if (step.size) label += ` (${step.size})`;
        lines.push(`  - ${label}`);
        if (step.toppings && (step.toppings.wholePizza || step.toppings.leftSide || step.toppings.rightSide)) {
          lines.push('    Toppings:');
          if (step.toppings.wholePizza && step.toppings.wholePizza.length > 0)
            lines.push('      Whole: ' + step.toppings.wholePizza.map(t => t.name).join(', '));
          if (step.toppings.leftSide && step.toppings.leftSide.length > 0)
            lines.push('      Left: ' + step.toppings.leftSide.map(t => t.name).join(', '));
          if (step.toppings.rightSide && step.toppings.rightSide.length > 0)
            lines.push('      Right: ' + step.toppings.rightSide.map(t => t.name).join(', '));
        }
        if (step.isHalfAndHalf) {
          lines.push('    Half & Half Pizza');
        }
        if (step.sauces && step.sauces.length > 0) {
          lines.push('    Sauces: ' + step.sauces.map(s => s.name).join(', '));
        }
        if (step.instructions && step.instructions.length > 0) {
          lines.push('    Instructions: ' + step.instructions.join(', '));
        }
        if (step.extraCharge && Number(step.extraCharge) > 0) {
          lines.push('    Extra Charge: +$' + Number(step.extraCharge).toFixed(2));
        }
      });
      if (item.extraCharges && item.extraCharges > 0) {
        lines.push(`  Extra Charge: +$${item.extraCharges.toFixed(2)}`);
      }
    } else if (item.customizations) {
      if (item.customizations.size) {
        lines.push(`  Size: ${item.customizations.size}`);
      }
      if (item.customizations.toppings && (item.customizations.toppings.wholePizza || item.customizations.toppings.leftSide || item.customizations.toppings.rightSide)) {
        lines.push('  Toppings:');
        if (item.customizations.toppings.wholePizza && item.customizations.toppings.wholePizza.length > 0)
          lines.push('    Whole: ' + item.customizations.toppings.wholePizza.map(t => t.name).join(', '));
        if (item.customizations.toppings.leftSide && item.customizations.toppings.leftSide.length > 0)
          lines.push('    Left: ' + item.customizations.toppings.leftSide.map(t => t.name).join(', '));
        if (item.customizations.toppings.rightSide && item.customizations.toppings.rightSide.length > 0)
          lines.push('    Right: ' + item.customizations.toppings.rightSide.map(t => t.name).join(', '));
      }
      if (item.customizations.isHalfAndHalf) {
        lines.push('  Half & Half Pizza');
      }
      if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) {
        lines.push(`  Sauces: ${item.customizations.sauces.map(s => s.name).join(', ')}`);
      }
      if (item.customizations.instructions && item.customizations.instructions.length > 0) {
        lines.push(`  Instructions: ${item.customizations.instructions.join(', ')}`);
      }
    }
    if (item.extraCharges && item.extraCharges > 0 && !isComboCustomizations(item.customizations) && !Array.isArray(item.customizations)) {
      lines.push(`  Extra Charge: +$${item.extraCharges.toFixed(2)}`);
    }
    // Add a blank line after each main item for readability (except last)
    if (itemIdx < order.items.length - 1) lines.push('');
  });
  lines.push('-----------------------------');
  if (order.subtotal !== undefined) lines.push(`Subtotal: $${order.subtotal.toFixed(2)}`);
  
  // Add discount information
  if (order.discount && order.discount > 0) {
    if (order.discounts && order.discounts.length > 0) {
      // Show discount code information
      order.discounts.forEach(discount => {
        lines.push(`Discount (${discount.name}): -$${discount.amount.toFixed(2)}`);
      });
    } else {
      // Show generic discount
      lines.push(`Discount: -$${order.discount.toFixed(2)}`);
    }
  }
  
  if (order.tax !== undefined) lines.push(`Tax: $${order.tax.toFixed(2)}`);
  if (order.total !== undefined) lines.push(`Total: $${order.total.toFixed(2)}`);
  lines.push('Thank you for your order!');
  return lines;
}

ipcMain.handle('print-receipt', async (event, order, type) => {
  const lines = renderReceipt(order, type);
  // For testing: always show the print preview window, never use a real printer
  console.warn('TEST MODE: Always showing print preview window, real printer is disabled.');
  const previewWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: 'Receipt Preview',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  const html = `
    <html>
      <head>
        <title>Receipt Preview</title>
        <style>
          body { font-family: monospace; background: #fff; color: #222; padding: 24px; }
          pre { font-size: 16px; white-space: pre-wrap; word-break: break-word; }
          button { font-size: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <h2>Receipt Preview</h2>
        <pre>${lines.map(l => l.replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n')}</pre>
        <button onclick="window.print()">Print</button>
      </body>
    </html>
  `;
  previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  return false;
});

ipcMain.handle('print-daily-sales-report', async (event, reportData, storeName) => {
  const lines = [
    `${storeName || 'Store'} - Daily Sales Report`,
    new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    '',
    'ORDER SUMMARY:',
    `Total Orders: ${reportData.totalOrders}`,
    `Delivery Orders: ${reportData.deliveryOrders} (${((reportData.deliveryOrders / reportData.totalOrders) * 100).toFixed(1)}%)`,
    `Pickup Orders: ${reportData.pickupOrders} (${((reportData.pickupOrders / reportData.totalOrders) * 100).toFixed(1)}%)`,
    `Cancelled Orders: ${reportData.cancelledOrders}`,
    '',
    'FINANCIAL SUMMARY:',
    `Gross Sales (with tax): $${reportData.grossSalesWithTax.toFixed(2)}`,
    `Gross Sales (without tax): $${reportData.grossSalesWithoutTax.toFixed(2)}`,
    `Total Tax Collected: $${reportData.totalTaxCollected.toFixed(2)}`,
    `Average Order Value: $${reportData.averageOrderValue.toFixed(2)}`,
    '',
    'CUSTOMER INSIGHTS:',
    `Unique Customers: ${reportData.uniqueCustomers}`,
    `First Order: ${reportData.firstOrderTime}`,
    `Last Order: ${reportData.lastOrderTime}`,
    `Peak Hour: ${reportData.peakHour}`,
    '',
    'ORDERS BY HOUR:',
    ...Object.entries(reportData.ordersByHour)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([hour, count]) => `${hour}: ${count} orders`),
    '',
    `Generated on: ${new Date().toLocaleString()}`
  ];

  // For testing: always show the print preview window, never use a real printer
  console.warn('TEST MODE: Always showing print preview window, real printer is disabled.');
  const previewWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: 'Daily Sales Report Preview',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  const html = `
    <html>
      <head>
        <title>Daily Sales Report Preview</title>
        <style>
          body { font-family: monospace; background: #fff; color: #222; padding: 24px; }
          pre { font-size: 16px; white-space: pre-wrap; word-break: break-word; }
          button { font-size: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <h2>Daily Sales Report Preview</h2>
        <pre>${lines.map(l => l.replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n')}</pre>
        <button onclick="window.print()">Print</button>
      </body>
    </html>
  `;
  previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  return false;
});

ipcMain.handle('print-custom-sales-report', async (event, reportData, storeName, startDate, endDate) => {
  const lines = [
    `${storeName || 'Store'} - Custom Sales Report`,
    `Date Range: ${startDate} to ${endDate}`,
    '',
    'ORDER SUMMARY:',
    `Total Orders: ${reportData.totalOrders}`,
    `Delivery Orders: ${reportData.deliveryOrders} (${((reportData.deliveryOrders / reportData.totalOrders) * 100).toFixed(1)}%)`,
    `Pickup Orders: ${reportData.pickupOrders} (${((reportData.pickupOrders / reportData.totalOrders) * 100).toFixed(1)}%)`,
    `Cancelled Orders: ${reportData.cancelledOrders}`,
    '',
    'FINANCIAL SUMMARY:',
    `Gross Sales (with tax): $${reportData.grossSalesWithTax.toFixed(2)}`,
    `Gross Sales (without tax): $${reportData.grossSalesWithoutTax.toFixed(2)}`,
    `Total Tax Collected: $${reportData.totalTaxCollected.toFixed(2)}`,
    `Average Order Value: $${reportData.averageOrderValue.toFixed(2)}`,
    '',
    'CUSTOMER INSIGHTS:',
    `Unique Customers: ${reportData.uniqueCustomers}`,
    `First Order: ${reportData.firstOrderTime}`,
    `Last Order: ${reportData.lastOrderTime}`,
    `Peak Hour: ${reportData.peakHour}`,
    '',
    'ORDERS BY HOUR:',
    ...Object.entries(reportData.ordersByHour)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([hour, count]) => `${hour}: ${count} orders`),
    '',
    `Generated on: ${new Date().toLocaleString()}`
  ];

  // For testing: always show the print preview window, never use a real printer
  console.warn('TEST MODE: Always showing print preview window, real printer is disabled.');
  const previewWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: 'Custom Sales Report Preview',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  const html = `
    <html>
      <head>
        <title>Custom Sales Report Preview</title>
        <style>
          body { font-family: monospace; background: #fff; color: #222; padding: 24px; }
          pre { font-size: 16px; white-space: pre-wrap; word-break: break-word; }
          button { font-size: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <h2>Custom Sales Report Preview</h2>
        <pre>${lines.map(l => l.replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n')}</pre>
        <button onclick="window.print()">Print</button>
      </body>
    </html>
  `;
  previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  return false;
});

function createWindow() {
  let mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/vite.svg'),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const menuTemplate = [
    {
      label: 'File',
      submenu: [{ role: 'quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Go Back',
          accelerator: 'Alt+Left',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win && win.webContents.canGoBack()) win.webContents.goBack();
          }
        },
        {
          label: 'Go Next',
          accelerator: 'Alt+Right',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win && win.webContents.canGoForward()) win.webContents.goForward();
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        {
          label: 'Daily Sales Report',
          accelerator: 'Ctrl+Shift+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('show-daily-sales-report');
            }
          }
        },
        {
          label: 'Custom Sales Report',
          accelerator: 'Ctrl+Shift+C',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('show-custom-sales-report');
            }
          }
        },
        { type: 'separator' },
        { role: 'resetzoom' }, { role: 'zoomin' }, { role: 'zoomout' },
        { type: 'separator' }, { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});
