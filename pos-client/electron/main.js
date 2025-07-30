import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import escpos from 'escpos';
import escposUSB from 'escpos-usb';
import { SerialPort } from 'serialport';

escpos.USB = escposUSB; // Attach USB to escpos

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// Enhanced Print queue system for COM6 to prevent access conflicts
const printQueue = [];
const pendingQueue = []; // Queue for jobs waiting for paper
let isProcessingQueue = false;
let persistentCOM6Port = null;
let queueId = 0; // Unique ID counter for jobs

// Paper status monitoring
let paperStatusInterval = null;
let lastPaperStatus = 'unknown';
let isPaperOut = false;

const initializeCOM6Port = async () => {
  if (persistentCOM6Port && persistentCOM6Port.isOpen) {
    return persistentCOM6Port;
  }
  
  // Close any existing connection first
  if (persistentCOM6Port) {
    try {
      persistentCOM6Port.close();
      persistentCOM6Port = null;
      // Give it a moment to fully release
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.log('💡 Cleaned up previous connection');
    }
  }
  
  try {
    console.log('🔌 Initializing COM6 connection...');
    
    // Use auto-open (default behavior) which is more reliable
    persistentCOM6Port = new SerialPort({
      path: 'COM6',
      baudRate: 38400,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
      // autoOpen: true (default)
    });
    
    // Wait for port to open with promise wrapper
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('COM6 connection timeout'));
      }, 5000);
      
      persistentCOM6Port.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ COM6 connection established');
        resolve();
      });
      
      persistentCOM6Port.on('error', (err) => {
        clearTimeout(timeout);
        console.error('❌ COM6 connection error:', err.message);
        reject(new Error(`COM6 error: ${err.message}`));
      });
    });
    
    // Start paper monitoring once connected
    startPaperMonitoring(persistentCOM6Port);
    
    return persistentCOM6Port;
  } catch (error) {
    console.error('❌ Failed to initialize COM6:', error.message);
    persistentCOM6Port = null;
    throw error;
  }
};

const processPrintQueue = async () => {
  if (isProcessingQueue || printQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  console.log(`📋 Processing print queue: ${printQueue.length} items`);
  
  try {
    // Try to initialize persistent COM6 connection
    const port = await initializeCOM6Port();
    
    while (printQueue.length > 0) {
      const printJob = printQueue.shift();
      try {
        console.log(`🖨️ Executing queued print job ${printJob.id}... (${printQueue.length} remaining)`);
        await printJob.execute(port);
        console.log(`✅ Print job ${printJob.id} completed`);
        
        // Resolve the individual job's promise
        if (printJob.resolve) {
          printJob.resolve(true);
        }
        
        // Minimal delay between prints (thermal printers are fast)
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error('❌ Print job failed:', error.message);
        
        // Reject the individual job's promise
        if (printJob.reject) {
          printJob.reject(error);
        }
        
        // Check if this is a paper out issue - move to pending queue
        if (error.message.includes('PAPER_OUT')) {
          console.log('📋 Moving failed job and remaining jobs to pending queue due to paper out');
          
          // Move the current failed job to pending queue (it will be retried)
          const retryJob = {
            ...printJob,
            retryCount: (printJob.retryCount || 0) + 1,
            originalError: error.message
          };
          pendingQueue.push(retryJob);
          
          // Move all remaining jobs to pending queue
          while (printQueue.length > 0) {
            const pendingJob = printQueue.shift();
            pendingQueue.push(pendingJob);
          }
          
          console.log(`📋 ${pendingQueue.length} jobs moved to pending queue. Waiting for paper replacement...`);
          
          // Send notification to frontend
          sendPaperOutNotification();
          
          break; // Stop processing queue
        }
        
        // Check if this is other critical printer issues
        if (error.message.includes('PRINTER_OFFLINE')) {
          console.error('🛑 Stopping queue processing due to printer offline:', error.message);
          
          // Reject all remaining jobs with the same error
          while (printQueue.length > 0) {
            const failedJob = printQueue.shift();
            if (failedJob.reject) {
              failedJob.reject(new Error(`Print job cancelled: ${error.message}`));
            }
          }
          break; // Stop processing queue
        }
        
        // For other errors, try to reconnect for next job
        if (printQueue.length > 0) {
          console.log('🔄 Attempting to reconnect for remaining jobs...');
          try {
            persistentCOM6Port = null;
            await new Promise(resolve => setTimeout(resolve, 1000));
            const newPort = await initializeCOM6Port();
            port = newPort; // Update port reference
          } catch (reconnectError) {
            console.error('❌ Reconnection failed, stopping queue processing');
            // Reject all remaining jobs
            while (printQueue.length > 0) {
              const failedJob = printQueue.shift();
              if (failedJob.reject) {
                failedJob.reject(new Error('Printer connection lost, remaining jobs cancelled'));
              }
            }
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Queue processing failed - COM6 not available:', error.message);
    console.log('💡 Suggestion: Close other apps that might be using COM6, or restart the POS application');
    
    // Reject all remaining jobs since we can't process them
    while (printQueue.length > 0) {
      const failedJob = printQueue.shift();
      if (failedJob.reject) {
        failedJob.reject(new Error(`COM6 connection failed: ${error.message}`));
      }
    }
  }
  
  isProcessingQueue = false;
  console.log('📋 Print queue processing complete');
};

// Paper status monitoring functions
const checkPaperStatus = async (port) => {
  return new Promise((resolve, reject) => {
    if (!port || !port.isOpen) {
      reject(new Error('Port not available'));
      return;
    }

    let responseBuffer = Buffer.alloc(0);
    let timeout;

    const onData = (data) => {
      responseBuffer = Buffer.concat([responseBuffer, data]);
      
      // Check if we have at least one status byte
      if (responseBuffer.length >= 1) {
        clearTimeout(timeout);
        port.removeListener('data', onData);
        
        const statusByte = responseBuffer[0];
        const status = parsePaperStatus(statusByte);
        resolve(status);
      }
    };

    const onTimeout = () => {
      port.removeListener('data', onData);
      resolve({ 
        paperOk: true, // Assume OK if no response (some printers don't respond)
        paperNearEnd: false,
        paperOut: false,
        error: false,
        offline: false 
      });
    };

    port.on('data', onData);
    timeout = setTimeout(onTimeout, 1000); // 1 second timeout

    // Send real-time status request (DLE EOT n)
    // n=1: Printer status, n=2: Offline status, n=3: Error status, n=4: Paper sensor status
    port.write(Buffer.from([0x10, 0x04, 0x04])); // Check paper sensor specifically
  });
};

const parsePaperStatus = (statusByte) => {
  // Parse ESC/POS status byte (varies by manufacturer)
  // Bit 2: Paper end sensor (1 = paper near end)
  // Bit 3: Paper not present (1 = no paper)
  // Bit 5: Printer offline (1 = offline)
  // Bit 6: Error occurred (1 = error)
  
  return {
    paperOk: (statusByte & 0x0C) === 0, // Both paper sensors OK
    paperNearEnd: (statusByte & 0x04) !== 0, // Bit 2: Paper near end
    paperOut: (statusByte & 0x08) !== 0, // Bit 3: Paper out
    error: (statusByte & 0x40) !== 0, // Bit 6: Error
    offline: (statusByte & 0x20) !== 0, // Bit 5: Offline
    rawStatus: statusByte
  };
};

const startPaperMonitoring = (port) => {
  if (paperStatusInterval) {
    clearInterval(paperStatusInterval);
  }

  console.log('🧾 Starting paper status monitoring...');
  
  paperStatusInterval = setInterval(async () => {
    try {
      const status = await checkPaperStatus(port);
      
      // Only log changes to avoid spam
      const currentStatus = status.paperOut ? 'out' : status.paperNearEnd ? 'low' : 'ok';
      if (currentStatus !== lastPaperStatus) {
        console.log(`🧾 Paper status changed: ${lastPaperStatus} → ${currentStatus}`);
        lastPaperStatus = currentStatus;
        
        const wasPaperOut = isPaperOut;
        isPaperOut = status.paperOut;
        
        // Send notification to frontend
        if (status.paperOut) {
          console.log('🚨 PAPER OUT - Please replace paper roll! All new print jobs will be blocked.');
          // Send paper out notification to frontend
          sendPaperOutNotification();
        } else if (status.paperNearEnd) {
          console.log('⚠️ PAPER LOW - Paper running low, consider replacing soon');
        } else if (currentStatus === 'ok') {
          console.log('✅ PAPER OK - Paper level normal');
          
          // If paper was out and now it's OK, resume pending jobs
          if (wasPaperOut && !isPaperOut) {
            console.log('🔄 Paper restored! Resuming pending print jobs...');
            resumePendingJobs();
          }
        }
      }
    } catch (error) {
      // Don't spam errors, just log occasionally
      if (Math.random() < 0.1) { // 10% chance to log error
        console.log('📝 Paper status check failed (this is normal for some printers)');
      }
    }
  }, 5000); // Check every 5 seconds
};

const stopPaperMonitoring = () => {
  if (paperStatusInterval) {
    clearInterval(paperStatusInterval);
    paperStatusInterval = null;
    console.log('🧾 Paper status monitoring stopped');
  }
};

// Send paper out notification to frontend
const sendPaperOutNotification = () => {
  // Send IPC event to all windows
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send('paper-status-changed', {
      status: 'out',
      message: '🚨 Paper roll is empty! Please replace paper to continue printing.',
      pendingJobs: pendingQueue.length
    });
  });
};

// Resume pending jobs when paper is restored
const resumePendingJobs = () => {
  if (pendingQueue.length === 0) {
    console.log('📋 No pending jobs to resume');
    return;
  }

  console.log(`🔄 Moving ${pendingQueue.length} pending jobs back to active queue`);
  
  // Move all pending jobs back to active queue
  while (pendingQueue.length > 0) {
    const job = pendingQueue.shift();
    printQueue.push(job);
  }

  console.log(`📋 Resumed ${printQueue.length} jobs. Starting queue processing...`);
  
  // Send update to frontend
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send('paper-status-changed', {
      status: 'ok',
      message: '✅ Paper restored! Resuming print jobs...',
      pendingJobs: 0,
      resumedJobs: printQueue.length
    });
  });

  // Start processing the queue
  processPrintQueue().catch(err => {
    console.error('❌ Error resuming queue:', err.message);
  });
};

const executeSerialPrint = async (port, lines) => {
  console.log('📝 Sending print data to persistent COM6...');
  
  // Check paper status before printing
  try {
    const paperStatus = await checkPaperStatus(port);
    console.log(`🧾 Paper status: ${JSON.stringify(paperStatus)}`);
    
    if (paperStatus.paperOut) {
      isPaperOut = true;
      throw new Error('🚨 PAPER_OUT: Paper roll is empty! Job will be queued until paper is replaced.');
    }
    
    if (paperStatus.offline) {
      throw new Error('🔌 PRINTER_OFFLINE: Printer is offline. Check printer connection.');
    }
    
    if (paperStatus.paperNearEnd) {
      console.log('⚠️ Warning: Paper level is low. Consider replacing soon.');
    }
    
    if (paperStatus.error) {
      console.log('⚠️ Warning: Printer reports an error condition.');
    }
    
  } catch (statusError) {
    // If the error is a paper/printer issue, we should NOT continue printing
    if (statusError.message.includes('PAPER_OUT') || statusError.message.includes('PRINTER_OFFLINE')) {
      console.error('❌ Print job BLOCKED due to paper/printer issue:', statusError.message);
      throw statusError; // Re-throw to stop the print job
    }
    
    // Only continue if it's a communication error (printer doesn't support status)
    console.log('📝 Paper status check communication failed, assuming printer OK:', statusError.message);
  }
  
  // Build complete command buffer
  const commandBuffer = [];
  
  // Initialize printer
  commandBuffer.push(Buffer.from([0x1B, 0x40])); // ESC @ - Initialize
  
  // Convert lines to ESC/POS commands
  for (const line of lines) {
    if (typeof line !== 'string') continue;
    
    // Handle bold text conversion (**text** -> ESC/POS bold)
    let processedLine = line.replace(/\*\*(.*?)\*\*/g, (match, text) => {
      return `\x1B\x45\x01${text}\x1B\x45\x00`; // ESC E 1 (bold on) + text + ESC E 0 (bold off)
    });
    
    commandBuffer.push(Buffer.from(processedLine + '\n', 'ascii'));
  }
  
  // Add proper spacing and print commands
  commandBuffer.push(Buffer.from([0x0A, 0x0A, 0x0A])); // 3 line feeds for spacing
  commandBuffer.push(Buffer.from([0x1B, 0x64, 0x03])); // ESC d - Feed 3 lines (ensures paper advances)
  commandBuffer.push(Buffer.from([0x1D, 0x56, 0x42, 0x03])); // GS V - Partial cut with 3-dot spacing
  
  // Combine all buffers and send as one operation
  const fullCommand = Buffer.concat(commandBuffer);
  
  console.log('📝 Sending receipt command buffer...');
  port.write(fullCommand);
  
  // Use drain event to know when all data is transmitted
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Print data transmission timeout')), 2000);
    
    port.drain((err) => {
      clearTimeout(timeout);
      if (err) {
        console.error('❌ Error draining port:', err);
        reject(err);
      } else {
        console.log('✅ Data transmitted to printer');
        resolve();
      }
    });
  });
  
  console.log('🎉 Receipt printed successfully!');
};

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

  if (store === 'store_001' || store === 'hamilton') {
    // Return serial printer indicator - actual connection handled by persistent COM6 system
    return {
      type: 'serial',
      store: 'hamilton'
    };
  }

  if (store === 'stcatherine') {
    const device = new escpos.Network('192.168.0.115');
    return new escpos.Printer(device);
  }

  return null;
}

function renderToppingsBySide(toppings, indent = '  ') {
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

function renderComboStep(step, idx) {
  const lines = [];
  let label = step.itemName || (step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : `Item ${idx + 1}`);
  if (step.size) label += ` (${step.size})`;
  lines.push(`  - ${label}`);
  // Toppings (pizza)
  if (step.toppings && (step.toppings.wholePizza || step.toppings.leftSide || step.toppings.rightSide)) {
    lines.push('    Toppings');
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
              lines.push('  Toppings');
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
              lines.push('  Toppings');
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
              lines.push('  Toppings');
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
          lines.push('    Toppings');
          lines.push(...renderToppingsBySide(step.toppings, '      '));
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
          lines.push('    Toppings');
          lines.push(...renderToppingsBySide(step.toppings, '      '));
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
        lines.push('  Toppings');
        lines.push(...renderToppingsBySide(item.customizations.toppings, '    '));
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

ipcMain.handle('print-receipt', async (event, order, type, showPreview = false) => {
  const lines = renderReceipt(order, type);
  const storeId = order.storeId || 'hamilton'; // Default to hamilton for testing
  
  console.log(`🖨️ Print request: store=${storeId}, type=${type}, showPreview=${showPreview}`);
  
  // If preview is explicitly requested, show it
  if (showPreview) {
    console.log('📄 Showing preview window as requested');
    showReceiptPreview(lines);
    return false;
  }
  
  try {
    const printer = getPrinterForStore(storeId);
    
    if (!printer) {
      console.error(`❌ No printer configured for store: ${storeId}`);
      console.error('Available stores: oakville, burlington, hamilton, stcatherine');
      throw new Error(`No printer found for store: ${storeId}`);
    }

    // Handle serial printer (Hamilton COM6) - use queue system
    if (printer.type === 'serial') {
      return new Promise((resolve, reject) => {
        queueId++; // Increment unique counter
        const jobId = `job_${queueId}_${Date.now()}`;
        
        const printJob = {
          id: jobId,
          orderData: { order, type }, // Store order data for retry
          lines: lines,
          createdAt: new Date(),
          retryCount: 0,
          execute: async (port) => {
            console.log(`🖨️ Executing job ${jobId}...`);
            await executeSerialPrint(port, lines);
          },
          resolve: resolve,
          reject: reject
        };
        
        // If paper is currently out, add directly to pending queue
        if (isPaperOut) {
          pendingQueue.push(printJob);
          console.log(`📋 Added job ${jobId} to PENDING queue (paper out). Pending: ${pendingQueue.length}`);
          
          // Send paper out notification
          sendPaperOutNotification();
          
          // Resolve with pending status instead of rejecting
          resolve({ 
            success: true, 
            status: 'pending', 
            message: 'Print job queued - waiting for paper replacement',
            jobId: jobId 
          });
          return;
        }
        
        printQueue.push(printJob);
        console.log(`📋 Added job ${jobId} to ACTIVE queue. Queue length: ${printQueue.length}`);
        console.log(`📋 Queue status: processing=${isProcessingQueue}, active=[${printQueue.map(j => j.id).join(', ')}], pending=[${pendingQueue.map(j => j.id).join(', ')}]`);
        
        // Start processing queue (don't await here to avoid blocking)
        processPrintQueue().catch(err => {
          console.error('❌ Queue processing error:', err.message);
          // Don't reject here as individual jobs handle their own errors
        });
      });
      
    } else {
      // Handle escpos printer (USB/Network)
      console.log('📄 Printing directly to escpos printer...');
      
      for (const line of lines) {
        if (typeof line !== 'string') continue;
        
        // Handle bold text conversion for escpos
        let processedLine = line.replace(/\*\*(.*?)\*\*/g, (match, text) => {
          return text; // Just remove the ** for now, escpos handles formatting differently
        });
        
        printer.text(processedLine + '\n');
      }
      
      printer.cut();
      printer.close();
      
      console.log('🎉 Receipt printed successfully to escpos printer!');
      return true;
    }
    
  } catch (err) {
    console.error('❌ DIRECT PRINTING FAILED:', err.message);
    console.error('❌ Error details:', err);
    
    // Don't fall back to preview - let the error bubble up
    throw new Error(`Printing failed: ${err.message}`);
  }
});

// IPC handler to check paper status on demand
ipcMain.handle('check-paper-status', async () => {
  try {
    if (!persistentCOM6Port || !persistentCOM6Port.isOpen) {
      return {
        available: false,
        message: 'Printer not connected'
      };
    }

    const status = await checkPaperStatus(persistentCOM6Port);
    
    return {
      available: true,
      paperStatus: status,
      message: status.paperOut 
        ? '🚨 Paper roll is empty!' 
        : status.paperNearEnd 
        ? '⚠️ Paper level is low' 
        : '✅ Paper level OK'
    };
  } catch (error) {
    return {
      available: false,
      message: `Paper status check failed: ${error.message}`
    };
  }
});

// IPC handler to get pending queue data
ipcMain.handle('get-pending-queue', async () => {
  try {
    return {
      pendingJobs: pendingQueue.map(job => ({
        id: job.id,
        orderData: job.orderData,
        createdAt: job.createdAt?.toISOString() || new Date().toISOString(),
        retryCount: job.retryCount || 0,
        originalError: job.originalError || 'Paper out'
      })),
      paperStatus: isPaperOut ? 'out' : lastPaperStatus === 'low' ? 'low' : 'ok',
      activeJobs: printQueue.length
    };
  } catch (error) {
    return {
      pendingJobs: [],
      paperStatus: 'ok',
      activeJobs: 0,
      error: error.message
    };
  }
});

// IPC handler to retry a specific pending job
ipcMain.handle('retry-pending-job', async (event, jobId) => {
  try {
    const jobIndex = pendingQueue.findIndex(job => job.id === jobId);
    if (jobIndex === -1) {
      throw new Error('Job not found in pending queue');
    }

    const job = pendingQueue.splice(jobIndex, 1)[0];
    job.retryCount = (job.retryCount || 0) + 1;
    
    // Move back to active queue
    printQueue.push(job);
    
    console.log(`🔄 Manually retrying job ${jobId} (retry #${job.retryCount})`);
    
    // Start processing if not already processing
    if (!isProcessingQueue) {
      processPrintQueue().catch(err => {
        console.error('❌ Error processing retry:', err.message);
      });
    }
    
    return { success: true, message: `Job ${jobId} moved to active queue` };
  } catch (error) {
    console.error('❌ Failed to retry job:', error.message);
    return { success: false, message: error.message };
  }
});

// IPC handler to cancel a specific pending job
ipcMain.handle('cancel-pending-job', async (event, jobId) => {
  try {
    const jobIndex = pendingQueue.findIndex(job => job.id === jobId);
    if (jobIndex === -1) {
      throw new Error('Job not found in pending queue');
    }

    const job = pendingQueue.splice(jobIndex, 1)[0];
    
    // Reject the job's promise if it exists
    if (job.reject) {
      job.reject(new Error('Job cancelled by user'));
    }
    
    console.log(`🗑️ Cancelled pending job ${jobId}`);
    
    return { success: true, message: `Job ${jobId} cancelled` };
  } catch (error) {
    console.error('❌ Failed to cancel job:', error.message);
    return { success: false, message: error.message };
  }
});

// IPC handler to clear all pending jobs
ipcMain.handle('clear-pending-queue', async () => {
  try {
    const cancelledCount = pendingQueue.length;
    
    // Reject all pending jobs
    while (pendingQueue.length > 0) {
      const job = pendingQueue.shift();
      if (job.reject) {
        job.reject(new Error('Job cancelled - queue cleared by user'));
      }
    }
    
    console.log(`🗑️ Cleared ${cancelledCount} pending jobs`);
    
    return { 
      success: true, 
      message: `Cancelled ${cancelledCount} pending job${cancelledCount !== 1 ? 's' : ''}` 
    };
  } catch (error) {
    console.error('❌ Failed to clear pending queue:', error.message);
    return { success: false, message: error.message };
  }
});

// Separate handler for receipt preview
ipcMain.handle('preview-receipt', async (event, order, type) => {
  const lines = renderReceipt(order, type);
  console.log('📄 Showing receipt preview window');
  showReceiptPreview(lines);
  return true;
});

function showReceiptPreview(lines) {
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
        <pre>${lines.map(l => String(l).replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n')}</pre>
        <button onclick="window.print()">Print</button>
      </body>
    </html>
  `;
  
  previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

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
  // Clean up paper monitoring
  stopPaperMonitoring();
  
  // Clean up persistent COM6 connection
  if (persistentCOM6Port && persistentCOM6Port.isOpen) {
    console.log('🔒 Closing persistent COM6 connection...');
    persistentCOM6Port.close();
  }
  
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Clean up paper monitoring
  stopPaperMonitoring();
  
  // Clean up persistent COM6 connection
  if (persistentCOM6Port && persistentCOM6Port.isOpen) {
    console.log('🔒 Closing persistent COM6 connection...');
    persistentCOM6Port.close();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});
