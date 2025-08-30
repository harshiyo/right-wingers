import { SerialPort } from 'serialport';
import escpos from 'escpos';
import escposUSB from 'escpos-usb';
import { PrintQueueManager } from './printQueueManager.js';
import { ReceiptRenderer } from './receiptRenderer.js';
import { KitchenReceiptRenderer } from './kitchenReceiptRenderer.js';
import { PaperStatusMonitor } from './paperStatusMonitor.js';

escpos.USB = escposUSB;

export class PrinterService {
  constructor() {
    this.printQueue = [];
    this.pendingQueue = [];
    this.isProcessingQueue = false;
    this.persistentPort = null;
    this.queueId = 0;
    
    // Initialize managers
    this.queueManager = new PrintQueueManager(this);
    this.receiptRenderer = new ReceiptRenderer();
    this.kitchenReceiptRenderer = new KitchenReceiptRenderer();
    this.paperMonitor = new PaperStatusMonitor(this);
    
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
      this.paperMonitor.startMonitoring(this.persistentPort);
      
      return this.persistentPort;
    } catch (error) {
      console.error('❌ Failed to initialize COM6:', error.message);
      this.persistentPort = null;
      throw error;
    }
  }

  async printReceipt(order, type) {
    // Create customer receipt job
    const customerJobId = ++this.queueId;
    const customerPrintJob = {
      id: customerJobId,
      order,
      type,
      receiptType: 'customer',
      status: 'pending',
      retryCount: 0,
      maxRetries: 3
    };
    
    // Create kitchen receipt job
    const kitchenJobId = ++this.queueId;
    const kitchenPrintJob = {
      id: kitchenJobId,
      order,
      type,
      receiptType: 'kitchen',
      status: 'pending',
      retryCount: 0,
      maxRetries: 3
    };
    
    // Add both jobs to queue
    this.printQueue.push(customerPrintJob);
    this.printQueue.push(kitchenPrintJob);
    
    if (!this.isProcessingQueue) {
      this.processPrintQueue();
    }
    
    return { success: true, customerJobId, kitchenJobId };
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
          let lines;
          if (job.receiptType === 'kitchen') {
            lines = this.kitchenReceiptRenderer.renderKitchenReceipt(job.order, job.type);
          } else {
            lines = this.receiptRenderer.renderReceipt(job.order, job.type);
          }
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
        this.paperMonitor.checkPaperStatus(port).then(status => {
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

  // Print report method for sales reports
  async printReport(reportText) {
    if (!this.persistentPort || !this.persistentPort.isOpen) {
      throw new Error('Printer not connected');
    }
    
    const lines = reportText.split('\n');
    await this.executePrint(this.persistentPort, lines);
  }

  cleanup() {
    this.paperMonitor.stopMonitoring();
    
    if (this.persistentPort && this.persistentPort.isOpen) {
      try {
        this.persistentPort.close();
      } catch (err) {
        // Silent cleanup error
      }
    }
  }
} 