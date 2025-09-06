import { SerialPort } from 'serialport';
import escpos from 'escpos';
import escposUSB from 'escpos-usb';
import { PrintQueueManager } from './printQueueManager.js';
import { ReceiptRenderer } from './receiptRenderer.js';
import { KitchenReceiptRenderer } from './kitchenReceiptRenderer.js';
import { PaperStatusMonitor } from './paperStatusMonitor.js';

escpos.USB = escposUSB;

export class DualPrinterService {
  constructor() {
    this.printQueue = [];
    this.pendingQueue = [];
    this.isProcessingQueue = false;
    this.queueId = 0;
    
    // Dual printer connections
    this.frontPrinter = {
      port: null,
      config: { port: 'COM6', baudRate: 38400, type: 'thermal' },
      monitor: null
    };
    
    this.kitchenPrinter = {
      port: null,
      config: { port: 'COM7', baudRate: 38400, type: 'impact' },
      monitor: null
    };
    
    // Printer behavior settings
    this.printerSettings = {
      enableDualPrinting: false,
      customerReceiptEnabled: true,
      kitchenReceiptEnabled: true,
      autoCutEnabled: true,
      printDelay: 500
    };
    
    // Initialize managers
    this.queueManager = new PrintQueueManager(this);
    this.receiptRenderer = new ReceiptRenderer();
    this.kitchenReceiptRenderer = new KitchenReceiptRenderer();
    
    // Event handlers
    this.onPaperStatusChanged = null;
    this.onPrintJobCompleted = null;
    this.onPrintJobFailed = null;
  }

  /**
   * Update printer configurations
   */
  updateConfiguration(config) {
    console.log('🔧 Updating dual printer configuration');
    
    if (config.frontPrinter) {
      this.frontPrinter.config = { ...this.frontPrinter.config, ...config.frontPrinter };
      console.log(`📄 Front printer: ${this.frontPrinter.config.port} (${this.frontPrinter.config.type})`);
    }
    
    if (config.kitchenPrinter) {
      this.kitchenPrinter.config = { ...this.kitchenPrinter.config, ...config.kitchenPrinter };
      console.log(`🍳 Kitchen printer: ${this.kitchenPrinter.config.port} (${this.kitchenPrinter.config.type})`);
    }
    
    if (config.printerSettings) {
      this.printerSettings = { ...this.printerSettings, ...config.printerSettings };
      console.log(`⚙️ Dual printing: ${this.printerSettings.enableDualPrinting ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Initialize connection to a specific printer
   */
  async initializePrinterConnection(printerType) {
    const printer = printerType === 'front' ? this.frontPrinter : this.kitchenPrinter;
    const config = printer.config;
    
    // Close existing connection if open
    if (printer.port && printer.port.isOpen) {
      await this.closePrinterConnection(printerType);
    }
    
    try {
      console.log(`🔌 Initializing ${printerType} printer: ${config.port} at ${config.baudRate} baud (${config.type})`);
      
      printer.port = new SerialPort({
        path: config.port,
        baudRate: config.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });
      
      printer.port.setMaxListeners(20);
      
      // Wait for port to open
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`${config.port} connection timeout`));
        }, 5000);
        
        printer.port.on('open', () => {
          clearTimeout(timeout);
          console.log(`✅ ${printerType} printer connected: ${config.port}`);
          resolve();
        });
        
        printer.port.on('error', (err) => {
          clearTimeout(timeout);
          console.error(`❌ ${printerType} printer error:`, err.message);
          reject(new Error(`${config.port} error: ${err.message}`));
        });
      });
      
      // Initialize paper monitoring
      if (!printer.monitor) {
        printer.monitor = new PaperStatusMonitor(this);
      }
      printer.monitor.startMonitoring(printer.port);
      
      return printer.port;
    } catch (error) {
      console.error(`❌ Failed to initialize ${printerType} printer:`, error.message);
      printer.port = null;
      throw error;
    }
  }

  /**
   * Close connection to a specific printer
   */
  async closePrinterConnection(printerType) {
    const printer = printerType === 'front' ? this.frontPrinter : this.kitchenPrinter;
    
    if (printer.port) {
      try {
        if (printer.monitor) {
          printer.monitor.stopMonitoring();
        }
        
        printer.port.removeAllListeners();
        
        if (printer.port.isOpen) {
          printer.port.close();
        }
        
        printer.port = null;
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log(`🔌 ${printerType} printer disconnected`);
      } catch (err) {
        console.warn(`Warning during ${printerType} printer cleanup:`, err.message);
        printer.port = null;
      }
    }
  }

  /**
   * Main print function - handles dual printer routing
   */
  async printReceipt(order, type) {
    const jobs = [];
    
    // Check if this is a kitchen-only print request
    const isKitchenOnly = order._kitchenOnly === true;
    
    console.log(`🖨️ Print request: ${isKitchenOnly ? 'Kitchen only' : 'Full order'}`);
    console.log(`🔧 Dual mode: ${this.printerSettings.enableDualPrinting ? 'Enabled' : 'Disabled'}`);
    
    // Create customer receipt job (front printer) - skip if kitchen only
    if (!isKitchenOnly && this.printerSettings.customerReceiptEnabled) {
      const customerJobId = ++this.queueId;
      const customerPrintJob = {
        id: customerJobId,
        order,
        type,
        receiptType: 'customer',
        printerType: 'front',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      };
      jobs.push(customerPrintJob);
      console.log(`📄 Added customer receipt job: ${customerJobId}`);
    }
    
    // Create kitchen receipt job
    if (this.printerSettings.kitchenReceiptEnabled) {
      const kitchenJobId = ++this.queueId;
      
      // Determine which printer to use for kitchen receipt
      let targetPrinter = 'front'; // Default to front printer
      
      if (this.printerSettings.enableDualPrinting) {
        targetPrinter = 'kitchen'; // Use kitchen printer in dual mode
      }
      
      const kitchenPrintJob = {
        id: kitchenJobId,
        order,
        type,
        receiptType: 'kitchen',
        printerType: targetPrinter,
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      };
      jobs.push(kitchenPrintJob);
      console.log(`🍳 Added kitchen receipt job: ${kitchenJobId} → ${targetPrinter} printer`);
    }
    
    if (jobs.length === 0) {
      console.log('⚠️ No print jobs created (all receipts disabled)');
      return { 
        success: true, 
        jobs: [],
        message: 'No receipts enabled for printing'
      };
    }
    
    // Add jobs to queue
    this.printQueue.push(...jobs);
    
    if (!this.isProcessingQueue) {
      this.processPrintQueue();
    }
    
    return { 
      success: true, 
      jobs: jobs.map(j => ({ id: j.id, receiptType: j.receiptType, printerType: j.printerType }))
    };
  }

  /**
   * Process print queue with dual printer support
   */
  async processPrintQueue() {
    if (this.isProcessingQueue || this.printQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    console.log(`📋 Processing print queue: ${this.printQueue.length} items`);
    
    try {
      while (this.printQueue.length > 0) {
        const job = this.printQueue.shift();
        const printerType = job.printerType;
        
        try {
          // Initialize printer connection if needed
          const printer = printerType === 'front' ? this.frontPrinter : this.kitchenPrinter;
          if (!printer.port || !printer.port.isOpen) {
            await this.initializePrinterConnection(printerType);
          }
          
          // Render receipt based on type
          let lines;
          if (job.receiptType === 'kitchen') {
            lines = this.kitchenReceiptRenderer.renderKitchenReceipt(job.order, job.type);
          } else {
            lines = this.receiptRenderer.renderReceipt(job.order, job.type);
          }
          
          // Print with cutting enabled
          await this.executePrint(printer.port, lines, this.printerSettings.autoCutEnabled);
          
          job.status = 'completed';
          if (this.onPrintJobCompleted) {
            this.onPrintJobCompleted(job);
          }
          
          console.log(`✅ ${job.receiptType} receipt printed on ${printerType} printer`);
          
          // Add delay between prints if configured
          if (this.printerSettings.printDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.printerSettings.printDelay));
          }
          
        } catch (error) {
          console.error(`❌ Print job ${job.id} failed:`, error.message);
          
          if (error.message.includes('PAPER_OUT')) {
            job.status = 'pending';
            this.pendingQueue.push(job);
          } else if (error.message.includes('PRINTER_OFFLINE')) {
            // Reject remaining jobs for this printer type
            const remainingJobs = this.printQueue.filter(j => j.printerType === job.printerType);
            remainingJobs.forEach(j => {
              j.status = 'failed';
              if (this.onPrintJobFailed) {
                this.onPrintJobFailed(j, error);
              }
            });
            // Remove failed jobs from queue
            this.printQueue = this.printQueue.filter(j => j.printerType !== job.printerType);
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
      }
      
    } catch (error) {
      console.error('Print queue processing error:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Execute print command to specific printer
   */
  async executePrint(port, lines, shouldCut = true) {
    return new Promise((resolve, reject) => {
      try {
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
            line = line.replace(/\*\*(.*?)\*\*/g, '\x1B\x45\x01$1\x1B\x45\x00');
          } else {
            // Left align for other content
            if (isCentered) {
              data += '\x1B\x61\x00'; // Left align
              isCentered = false;
            }
            if (line.includes('**')) {
              line = line.replace(/\*\*(.*?)\*\*/g, '\x1B\x45\x01$1\x1B\x45\x00');
            }
          }
          data += line + '\n';
        });
        
        // Add spacing and cut command if needed
        if (shouldCut) {
          data += '\n\n\n\n\n\n'; // Extra spacing for clean cut
          data += '\x1D\x56\x00'; // Cut command
        }
        
        port.write(data, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          port.drain(() => {
            if (shouldCut) {
              setTimeout(() => {
                resolve();
              }, 300);
            } else {
              resolve();
            }
          });
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Test connection to specific printer
   */
  async testPrinterConnection(printerType, printTest = false) {
    const printer = printerType === 'front' ? this.frontPrinter : this.kitchenPrinter;
    const config = printer.config;
    
    console.log(`🧪 Testing ${printerType} printer: ${config.port} at ${config.baudRate} baud`);
    
    let testPort = null;
    try {
      testPort = new SerialPort({
        path: config.port,
        baudRate: config.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout to ${config.port}`));
        }, 5000);

        testPort.open((err) => {
          clearTimeout(timeout);
          if (err) {
            let userFriendlyError = err.message || 'Unknown error';
            
            if (err.message && err.message.includes('Access is denied')) {
              userFriendlyError = `Port ${config.port} is already in use`;
            } else if (err.message && err.message.includes('cannot find the path')) {
              userFriendlyError = `Port ${config.port} does not exist`;
            }
            
            reject(new Error(`Failed to open ${config.port}: ${userFriendlyError}`));
          } else {
            resolve();
          }
        });
      });

      console.log(`✅ ${printerType} printer port opened successfully`);

      if (printTest) {
        const testReceipt = 
          '\x1B\x40' +                    // Initialize printer
          '\x1B\x61\x01' +                // Center align
          '\x1B\x45\x01' +                // Bold on
          `${printerType.toUpperCase()} PRINTER TEST\n` +
          '\x1B\x45\x00' +                // Bold off
          '\x1B\x61\x00' +                // Left align
          `Type: ${config.type}\n` +
          `Port: ${config.port}\n` +
          `Baud: ${config.baudRate}\n` +
          `Time: ${new Date().toLocaleTimeString()}\n` +
          '\n\n\n' +
          '\x1D\x56\x00';                 // Cut paper
        
        await new Promise((resolve, reject) => {
          testPort.write(testReceipt, (writeErr) => {
            if (writeErr) {
              reject(new Error(`Test print failed: ${writeErr.message}`));
            } else {
              setTimeout(resolve, 2000);
            }
          });
        });
      }
      
      testPort.close();
      
      return {
        success: true,
        message: `${printerType} printer (${config.type}) connected successfully on ${config.port}`
      };
      
    } catch (error) {
      if (testPort && testPort.isOpen) {
        testPort.close();
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test both printers
   */
  async testAllPrinters(printTest = false) {
    console.log('🧪 Testing all configured printers...');
    
    const results = {
      front: await this.testPrinterConnection('front', printTest),
      kitchen: this.printerSettings.enableDualPrinting ? 
        await this.testPrinterConnection('kitchen', printTest) : 
        { success: true, message: 'Kitchen printer disabled (single printer mode)' }
    };
    
    const allSuccess = results.front.success && results.kitchen.success;
    
    console.log('📋 Test Results:');
    console.log(`   📄 Front: ${results.front.success ? '✅' : '❌'} ${results.front.message || results.front.error}`);
    console.log(`   🍳 Kitchen: ${results.kitchen.success ? '✅' : '❌'} ${results.kitchen.message || results.kitchen.error}`);
    
    return {
      success: allSuccess,
      results
    };
  }

  /**
   * Print report to front printer only
   */
  async printReport(reportText) {
    if (!this.frontPrinter.port || !this.frontPrinter.port.isOpen) {
      await this.initializePrinterConnection('front');
    }
    
    const lines = reportText.split('\n');
    await this.executePrint(this.frontPrinter.port, lines, this.printerSettings.autoCutEnabled);
  }

  /**
   * Legacy methods for backward compatibility
   */
  async updateSettings(port, baudRate) {
    console.log('🔧 Using legacy updateSettings - updating front printer only');
    this.updateConfiguration({
      frontPrinter: { port, baudRate, type: 'thermal' }
    });
  }

  async testConnection(port, baudRate, printTest = false) {
    console.log('🧪 Using legacy testConnection - testing as front printer');
    this.updateConfiguration({
      frontPrinter: { port, baudRate, type: 'thermal' }
    });
    return await this.testPrinterConnection('front', printTest);
  }

  // Delegate to managers
  getPendingQueue() {
    return this.pendingQueue;
  }

  retryPendingJob(jobId) {
    return this.queueManager.retryPendingJob(jobId);
  }

  cancelPendingJob(jobId) {
    return this.queueManager.cancelPendingJob(jobId);
  }

  clearPendingQueue() {
    return this.queueManager.clearPendingQueue();
  }

  /**
   * Cleanup all connections
   */
  async cleanup() {
    await Promise.all([
      this.closePrinterConnection('front'),
      this.closePrinterConnection('kitchen')
    ]);
  }
}
