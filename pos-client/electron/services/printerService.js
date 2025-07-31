import { SerialPort } from 'serialport';
import escpos from 'escpos';
import escposUSB from 'escpos-usb';

escpos.USB = escposUSB;

export class PrinterService {
  constructor() {
    this.printQueue = [];
    this.pendingQueue = [];
    this.isProcessingQueue = false;
    this.persistentPort = null;
    this.queueId = 0;
    
    // Paper status monitoring
    this.paperStatusInterval = null;
    this.lastPaperStatus = 'unknown';
    this.isPaperOut = false;
    
    // Event handlers
    this.onPaperStatusChanged = null;
    this.onPrintJobCompleted = null;
    this.onPrintJobFailed = null;
  }

  async initializeConnection(port = 'COM6', baudRate = 38400) {
    if (this.persistentPort && this.persistentPort.isOpen) {
      return this.persistentPort;
    }
    
    // Close any existing connection first
    if (this.persistentPort) {
      try {
        this.persistentPort.close();
        this.persistentPort = null;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.log('💡 Cleaned up previous connection');
      }
    }
    
    try {
      console.log('🔌 Initializing COM6 connection...');
      
      this.persistentPort = new SerialPort({
        path: port,
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });
      
      // Wait for port to open with promise wrapper
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('COM6 connection timeout'));
        }, 5000);
        
        this.persistentPort.on('open', () => {
          clearTimeout(timeout);
          console.log('✅ COM6 connection established');
          resolve();
        });
        
        this.persistentPort.on('error', (err) => {
          clearTimeout(timeout);
          console.error('❌ COM6 connection error:', err.message);
          reject(new Error(`COM6 error: ${err.message}`));
        });
      });
      
      // Start paper monitoring once connected
      this.startPaperMonitoring(this.persistentPort);
      
      return this.persistentPort;
    } catch (error) {
      console.error('❌ Failed to initialize COM6:', error.message);
      this.persistentPort = null;
      throw error;
    }
  }

  async printReceipt(order, type) {
    const jobId = ++this.queueId;
    const printJob = {
      id: jobId,
      order,
      type,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3
    };
    
    this.printQueue.push(printJob);
    
    if (!this.isProcessingQueue) {
      this.processPrintQueue();
    }
    
    return { success: true, jobId };
  }

  async processPrintQueue() {
    if (this.isProcessingQueue || this.printQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    console.log(`📋 Processing print queue: ${this.printQueue.length} items`);
    
    try {
      const port = await this.initializeConnection();
      
      while (this.printQueue.length > 0) {
        const job = this.printQueue.shift();
        try {
          const lines = this.renderReceipt(job.order, job.type);
          await this.executePrint(port, lines);
          
          job.status = 'completed';
          if (this.onPrintJobCompleted) {
            this.onPrintJobCompleted(job);
          }
          
        } catch (error) {
          if (error.message.includes('PAPER_OUT')) {
            job.status = 'pending';
            this.pendingQueue.push(job);
          } else if (error.message.includes('PRINTER_OFFLINE')) {
            // Reject all remaining jobs
            this.printQueue.forEach(j => {
              j.status = 'failed';
              if (this.onPrintJobFailed) {
                this.onPrintJobFailed(j, error);
              }
            });
            this.printQueue.length = 0;
            break;
          } else {
            // Retry logic
            if (job.retryCount < job.maxRetries) {
              job.retryCount++;
              setTimeout(() => {
                this.printQueue.unshift(job);
              }, 1000);
            } else {
              job.status = 'failed';
              if (this.onPrintJobFailed) {
                this.onPrintJobFailed(job, error);
              }
            }
          }
        }
        
        // Small delay between jobs
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Print queue processing error:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  async executePrint(port, lines) {
    return new Promise((resolve, reject) => {
      try {
        // Check paper status before printing
        this.checkPaperStatus(port).then(status => {
          if (status.paperOut) {
            reject(new Error('PAPER_OUT'));
            return;
          }
          if (status.offline) {
            reject(new Error('PRINTER_OFFLINE'));
            return;
          }
        }).catch(() => {
          // Continue with print if status check fails
        });
        
        // Convert lines to ESC/POS commands
        let data = '';
        let isCentered = false;
        
        lines.forEach((line, index) => {
          // Check if this is store information (first few lines with **)
          if (index < 3 && line.includes('**')) {
            // Center align for store info
            if (!isCentered) {
              data += '\x1B\x61\x01'; // Center align
              isCentered = true;
            }
            // Handle bold formatting for store info
            line = line.replace(/\*\*(.*?)\*\*/g, '\x1B\x45\x01$1\x1B\x45\x00');
          } else {
            // Left align for other content
            if (isCentered) {
              data += '\x1B\x61\x00'; // Left align
              isCentered = false;
            }
            // Handle bold formatting for other content
            if (line.includes('**')) {
              line = line.replace(/\*\*(.*?)\*\*/g, '\x1B\x45\x01$1\x1B\x45\x00');
            }
          }
          data += line + '\n';
        });
        
        // Add cut command
        data += '\x1D\x56\x00';
        
        port.write(data, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
              port.drain(() => {
                resolve();
              });
            });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async checkPaperStatus(port) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve({ paperOut: false, offline: false });
      }, 2000);
      
      const onData = (data) => {
        clearTimeout(timeout);
        port.removeListener('data', onData);
        
        if (data.length > 0) {
          const statusByte = data[0];
          const status = this.parsePaperStatus(statusByte);
          this.lastPaperStatus = status;
          
          if (status.paperOut) {
            this.isPaperOut = true;
            this.sendPaperOutNotification();
          } else {
            this.isPaperOut = false;
            this.resumePendingJobs();
          }
          
          resolve(status);
        } else {
          resolve({ paperOut: false, offline: false });
        }
      };
      
      port.on('data', onData);
      port.write('\x10\x04\x04'); // DLE EOT 4 command
    });
  }

  parsePaperStatus(statusByte) {
    return {
      paperOut: (statusByte & 0x04) !== 0,
      paperNearEnd: (statusByte & 0x08) !== 0,
      offline: (statusByte & 0x01) !== 0,
      error: (statusByte & 0x02) !== 0
    };
  }

  startPaperMonitoring(port) {
    if (this.paperStatusInterval) {
      clearInterval(this.paperStatusInterval);
    }
    
    this.paperStatusInterval = setInterval(async () => {
      try {
        await this.checkPaperStatus(port);
      } catch (error) {
        // Silent monitoring error
      }
    }, 10000); // Check every 10 seconds
  }

  stopPaperMonitoring() {
    if (this.paperStatusInterval) {
      clearInterval(this.paperStatusInterval);
      this.paperStatusInterval = null;
    }
  }

  sendPaperOutNotification() {
    if (this.onPaperStatusChanged) {
      this.onPaperStatusChanged({ paperOut: true });
    }
  }

  resumePendingJobs() {
    if (this.pendingQueue.length > 0 && !this.isPaperOut) {
      while (this.pendingQueue.length > 0) {
        const job = this.pendingQueue.shift();
        job.status = 'pending';
        job.retryCount = 0;
        this.printQueue.push(job);
      }
      
      if (!this.isProcessingQueue) {
        this.processPrintQueue();
      }
    }
  }

  getPendingQueue() {
    return this.pendingQueue;
  }

  retryPendingJob(jobId) {
    const job = this.pendingQueue.find(j => j.id === jobId);
    if (job) {
      this.pendingQueue = this.pendingQueue.filter(j => j.id !== jobId);
      job.status = 'pending';
      job.retryCount = 0;
      this.printQueue.push(job);
      
      if (!this.isProcessingQueue) {
        this.processPrintQueue();
      }
      return { success: true };
    }
    return { success: false, message: 'Job not found' };
  }

  cancelPendingJob(jobId) {
    const job = this.pendingQueue.find(j => j.id === jobId);
    if (job) {
      this.pendingQueue = this.pendingQueue.filter(j => j.id !== jobId);
      return { success: true };
    }
    return { success: false, message: 'Job not found' };
  }

  clearPendingQueue() {
    this.pendingQueue.length = 0;
    return { success: true };
  }

  cleanup() {
    this.stopPaperMonitoring();
    
    if (this.persistentPort && this.persistentPort.isOpen) {
      try {
        this.persistentPort.close();
      } catch (err) {
        // Silent cleanup error
      }
    }
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

  renderComboStep(step, idx) {
    const lines = [];
    let label = step.itemName || (step.type ? step.type.charAt(0).toUpperCase() + step.type.slice(1) : `Item ${idx + 1}`);
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
    // Extra charge
    if (step.extraCharge && Number(step.extraCharge) > 0) {
      lines.push(`    Extra Charge: +$${Number(step.extraCharge).toFixed(2)}`);
    }
    return lines;
  }

  isComboCustomizations(customizations) {
    if (!customizations || Array.isArray(customizations)) return false;
    const keys = Object.keys(customizations);
    return keys.length > 0 && keys.every(k => !isNaN(Number(k)));
  }

  renderReceipt(order, type) {
    // DEBUG: Log the full order object to troubleshoot combo rendering
    console.log('DEBUG RECEIVED ORDER:', JSON.stringify(order, null, 2));
    const lines = [];
    
    // Store information - centered and bold
    if (order.storeName) lines.push('**' + order.storeName + '**');
    if (order.storeAddress) lines.push('**' + order.storeAddress + '**');
    if (order.storePhone) lines.push('**' + order.storePhone + '**');
    lines.push('-----------------------------');
    
    // Order type
    if (order.orderType) {
      const orderTypeText = order.orderType === 'delivery' ? 'DELIVERY ORDER' : 'PICKUP ORDER';
      lines.push(orderTypeText);
      
      // Add delivery address for delivery orders
      if (order.orderType === 'delivery' && order.deliveryAddress) {
        lines.push('DELIVERY ADDRESS:');
        if (order.deliveryAddress.street) lines.push(order.deliveryAddress.street);
        if (order.deliveryAddress.city && order.deliveryAddress.postalCode) {
          lines.push(`${order.deliveryAddress.city}, ON ${order.deliveryAddress.postalCode}`);
        }
        
        // Add customer info for delivery
        if (order.customerName || order.customerPhone) {
          lines.push('CUSTOMER:');
          if (order.customerName) lines.push(order.customerName);
          if (order.customerPhone) lines.push(order.customerPhone);
        }
      }
    }
    
    // Order information - more compact
    if (order.orderNumber) lines.push(`Order #: ${order.orderNumber}`);
    if (order.orderDate) {
      const date = new Date(order.orderDate);
      lines.push(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    }
    
    // Scheduled order information
    if (order.scheduledTime) {
      const scheduledDate = new Date(order.scheduledTime);
      lines.push(`Scheduled: ${scheduledDate.toLocaleDateString()} ${scheduledDate.toLocaleTimeString()}`);
    }
    
    // Customer info - only if not already shown for delivery
    if (order.orderType !== 'delivery' && (order.customerInfo?.name || order.customerInfo?.phone)) {
      if (order.customerInfo?.name) lines.push(`Customer: ${order.customerInfo.name}`);
      if (order.customerInfo?.phone) lines.push(`Phone: ${order.customerInfo.phone}`);
    }
    
    // Pickup/Delivery details - more compact
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
              item.customizations.forEach((step, idx) => lines.push(...this.renderComboStep(step, idx)));
            } else if (this.isComboCustomizations(item.customizations)) {
              const steps = Object.keys(item.customizations)
                .sort((a, b) => Number(a) - Number(b))
                .map(k => item.customizations[k]);
              steps.forEach((step, idx) => lines.push(...this.renderComboStep(step, idx)));
            } else {
              if (item.customizations.size) lines.push(`  Size: ${item.customizations.size}`);
              if (item.customizations.toppings) {
                //lines.push('  Toppings');
                lines.push(...this.renderToppingsBySide(item.customizations.toppings, '    '));
              }
              if (item.customizations.isHalfAndHalf) lines.push('  Half & Half Pizza');
              if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) {
                const sauceNames = item.customizations.sauces.map(s => s.name).filter(name => name);
                if (sauceNames.length > 0) {
                  //lines.push(`  Sauces`);
                  sauceNames.forEach(sauce => {
                    lines.push(`    ${sauce}`);
                  });
                }
              }
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
              item.customizations.forEach((step, idx) => lines.push(...this.renderComboStep(step, idx)));
            } else if (this.isComboCustomizations(item.customizations)) {
              const steps = Object.keys(item.customizations)
                .sort((a, b) => Number(a) - Number(b))
                .map(k => item.customizations[k]);
              steps.forEach((step, idx) => lines.push(...this.renderComboStep(step, idx)));
            } else {
              if (item.customizations.size) lines.push(`  Size: ${item.customizations.size}`);
              if (item.customizations.toppings) {
                //lines.push('  Toppings');
                lines.push(...this.renderToppingsBySide(item.customizations.toppings, '    '));
              }
              if (item.customizations.isHalfAndHalf) lines.push('  Half & Half Pizza');
              if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) {
                const sauceNames = item.customizations.sauces.map(s => s.name).filter(name => name);
                if (sauceNames.length > 0) {
                  //lines.push(`  Sauces`);
                  sauceNames.forEach(sauce => {
                    lines.push(`    ${sauce}`);
                  });
                }
              }
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
              item.customizations.forEach((step, idx) => lines.push(...this.renderComboStep(step, idx)));
            } else if (this.isComboCustomizations(item.customizations)) {
              const steps = Object.keys(item.customizations)
                .sort((a, b) => Number(a) - Number(b))
                .map(k => item.customizations[k]);
              steps.forEach((step, idx) => lines.push(...this.renderComboStep(step, idx)));
            } else {
              if (item.customizations.size) lines.push(`  Size: ${item.customizations.size}`);
              if (item.customizations.toppings) {
                //lines.push('  Toppings');
                lines.push(...this.renderToppingsBySide(item.customizations.toppings, '    '));
              }
              if (item.customizations.isHalfAndHalf) lines.push('  Half & Half Pizza');
              if (item.customizations.sauces && Array.isArray(item.customizations.sauces) && item.customizations.sauces.length > 0) {
                const sauceNames = item.customizations.sauces.map(s => s.name).filter(name => name);
                if (sauceNames.length > 0) {
                  //lines.push(`  Sauces`);
                  sauceNames.forEach(sauce => {
                    lines.push(`    ${sauce}`);
                  });
                }
              }
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
    
    // Items
    if (order.items && order.items.length > 0) {
      lines.push('ITEMS:');
      order.items.forEach((item, itemIdx) => {
        // Check if it's a combo by looking for combo customizations (numbered keys)
        if (item.type === 'combo' || (item.customizations && this.isComboCustomizations(item.customizations))) {
          this.renderComboItem(lines, item);
        } else {
          this.renderRegularItem(lines, item);
        }
        
        // Add spacing between items (except for the last item)
        if (itemIdx < order.items.length - 1) {
          lines.push('');
        }
      });
    }
    
    // Totals
    lines.push('-----------------------------');
    if (order.subtotal) {
      const subtotalStr = `$${order.subtotal.toFixed(2)}`;
      const padding = Math.max(0, 32 - 'Subtotal:'.length - subtotalStr.length);
      lines.push(`Subtotal:${' '.repeat(padding)}${subtotalStr}`);
    }
    if (order.tax) {
      const taxStr = `$${order.tax.toFixed(2)}`;
      const padding = Math.max(0, 32 - 'Tax:'.length - taxStr.length);
      lines.push(`Tax:${' '.repeat(padding)}${taxStr}`);
    }
    if (order.deliveryFee) {
      const deliveryStr = `$${order.deliveryFee.toFixed(2)}`;
      const padding = Math.max(0, 32 - 'Delivery Fee:'.length - deliveryStr.length);
      lines.push(`Delivery Fee:${' '.repeat(padding)}${deliveryStr}`);
    }
    if (order.discount) {
      const discountStr = `-$${order.discount.toFixed(2)}`;
      const padding = Math.max(0, 32 - 'Discount:'.length - discountStr.length);
      lines.push(`Discount:${' '.repeat(padding)}${discountStr}`);
    }
    if (order.total) {
      const totalStr = `$${order.total.toFixed(2)}`;
      const padding = Math.max(0, 32 - 'TOTAL:'.length - totalStr.length);
      lines.push(`TOTAL:${' '.repeat(padding)}${totalStr}`);
    }
    
    // Footer
    lines.push('-----------------------------');
    lines.push('Thank you for your order!');
    lines.push(`Order placed at: ${new Date().toLocaleString()}`);
    
    return lines;
  }

  renderComboItem(lines, combo) {
    // Right-align the price by padding with spaces
    const priceStr = `$${combo.price.toFixed(2)}`;
    const itemLine = `${combo.quantity}x ${combo.name}`;
    const padding = Math.max(0, 32 - itemLine.length - priceStr.length); // 32 chars total width
    lines.push(`${itemLine}${' '.repeat(padding)}${priceStr}`);
    
    if (combo.customizations) {
      const customizations = combo.customizations;
      
      // Handle combo customizations (object with numeric keys)
      if (this.isComboCustomizations(customizations)) {
        // Sort the keys numerically and render each step
        const steps = Object.keys(customizations)
          .sort((a, b) => Number(a) - Number(b))
          .map(k => customizations[k]);
        
        steps.forEach((step, idx) => {
          const stepLines = this.renderComboStep(step, idx);
          if (Array.isArray(stepLines)) {
            lines.push(...stepLines);
          }
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
    
    // Extra charges for combo
    if (combo.extraCharges && Number(combo.extraCharges) > 0) {
      const extraStr = `+$${Number(combo.extraCharges).toFixed(2)}`;
      lines.push(`  Extra Charge: ${extraStr}`);
    }
  }

  renderRegularItem(lines, item) {
    // Right-align the price by padding with spaces
    const priceStr = `$${item.price.toFixed(2)}`;
    const itemLine = `${item.quantity}x ${item.name}`;
    const padding = Math.max(0, 32 - itemLine.length - priceStr.length); // 32 chars total width
    lines.push(`${itemLine}${' '.repeat(padding)}${priceStr}`);
    
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
          
          // Extra charges for combo items
          if (step.extraCharge && Number(step.extraCharge) > 0) {
            lines.push(`    Extra Charge: $${Number(step.extraCharge).toFixed(2)}`);
          }
        });
      }
    }
    
    // Extra charges
    if (item.extraCharges && Number(item.extraCharges) > 0) {
      lines.push(`  Extra Charge: $${Number(item.extraCharges).toFixed(2)}`);
    }
  }
} 