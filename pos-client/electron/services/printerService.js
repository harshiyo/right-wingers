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
    
    // Default printer settings
    this.currentPort = 'COM6';
    this.currentBaudRate = 38400;
    
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

  async initializeConnection(port = null, baudRate = null) {
    // Use provided settings or fall back to current settings
    const usePort = port || this.currentPort;
    const useBaudRate = baudRate || this.currentBaudRate;
    
    if (this.persistentPort && this.persistentPort.isOpen) {
      // Check if we need to reinitialize with different settings
      if (usePort === this.currentPort && useBaudRate === this.currentBaudRate) {
        return this.persistentPort;
      } else {
        // Close existing connection to reinitialize with new settings
        await this.closeConnection();
      }
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
      console.log(`🔌 Initializing ${usePort} connection at ${useBaudRate} baud...`);
      
      this.persistentPort = new SerialPort({
        path: usePort,
        baudRate: useBaudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });
      
      // Update current settings
      this.currentPort = usePort;
      this.currentBaudRate = useBaudRate;
      
      // Wait for port to open with promise wrapper
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`${usePort} connection timeout`));
        }, 5000);
        
        this.persistentPort.on('open', () => {
          clearTimeout(timeout);
          console.log(`✅ ${usePort} connection established`);
          resolve();
        });
        
        this.persistentPort.on('error', (err) => {
          clearTimeout(timeout);
          console.error(`❌ ${usePort} connection error:`, err.message);
          reject(new Error(`${usePort} error: ${err.message}`));
        });
      });
      
      // Start paper monitoring once connected
      this.paperMonitor.startMonitoring(this.persistentPort);
      
      return this.persistentPort;
    } catch (error) {
      console.error(`❌ Failed to initialize ${usePort}:`, error.message);
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

  // Update printer settings and reinitialize connection
  async updateSettings(port, baudRate) {
    console.log(`🔧 Updating printer settings to ${port} at ${baudRate} baud`);
    
    // Store new settings
    this.currentPort = port;
    this.currentBaudRate = baudRate;
    
    // If there's an active connection, reinitialize with new settings
    if (this.persistentPort && this.persistentPort.isOpen) {
      try {
        await this.closeConnection();
        // The next print operation will automatically initialize with new settings
        console.log('🔄 Connection will be reinitialized with new settings on next print');
      } catch (error) {
        console.error('Error reinitializing connection:', error);
        throw error;
      }
    }
    
    return { success: true };
  }

    // Test connection with specific settings
  async testConnection(port, baudRate, printTest = false) {
    console.log(`🧪 Testing connection to ${port} at ${baudRate} baud${printTest ? ' (with test print)' : ''}`);
    console.log(`📋 Print test mode: ${printTest}`);
    
    let testPort = null;
    try {
      testPort = new SerialPort({
        path: port,
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false
      });

      // Open the port
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout to ${port}`));
        }, 5000);

        testPort.open((err) => {
          clearTimeout(timeout);
          if (err) {
            // Map common error messages to user-friendly descriptions
            let userFriendlyError = err.message || 'Unknown error';
            
            if (err.message && err.message.includes('Access is denied')) {
              userFriendlyError = `Port ${port} is already in use by another application`;
            } else if (err.message && err.message.includes('cannot find the path')) {
              userFriendlyError = `Port ${port} does not exist. Check if the printer is connected and drivers are installed`;
            } else if (err.message && err.message.includes('system cannot find')) {
              userFriendlyError = `Port ${port} not found. Verify the correct port name`;
            }
            
            reject(new Error(`Failed to open ${port}: ${userFriendlyError}`));
          } else {
            resolve();
          }
        });
      });

      console.log(`✅ Port ${port} opened, testing printer response...`);

      // Send a test command and wait for response
      const testResult = await this.sendTestPrintCommand(testPort, printTest);
      
      // Always close test connection - regardless of success or failure
      try {
        if (testPort && testPort.isOpen) {
          testPort.close();
          console.log(`🔌 Closed test connection to ${port}`);
        }
      } catch (closeError) {
        console.log(`⚠️ Warning: Could not close test port ${port}:`, closeError.message);
      }
      
      if (testResult.success) {
        return { 
          success: true, 
          message: `Printer connected and responding on ${port} at ${baudRate} baud` 
        };
      } else {
        const errorMsg = testResult.error || 'No response from printer';
        return {
          success: false,
          error: `Port ${port} opened but no printer response: ${errorMsg}`
        };
      }
      
    } catch (error) {
      // Ensure port is closed even if an exception occurs
      try {
        if (testPort && testPort.isOpen) {
          testPort.close();
          console.log(`🔌 Closed test connection to ${port} (after error)`);
        }
      } catch (closeError) {
        console.log(`⚠️ Warning: Could not close test port ${port} after error:`, closeError.message);
      }
      
      const errorMessage = error.message || error.toString() || 'Unknown connection error';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  // Send test print command to verify printer is connected and responding
  async sendTestPrintCommand(port, printTestReceipt = false) {
    return new Promise((resolve) => {
      let responseReceived = false;
      let errorOccurred = false;
      
      // Set up timeout for printer response
      const responseTimeout = setTimeout(() => {
        if (!responseReceived && !errorOccurred) {
          port.removeListener('data', dataHandler);
          port.removeListener('error', errorHandler);
          resolve({
            success: false,
            error: 'Printer not responding (timeout after 3 seconds)'
          });
        }
      }, 5000); // Increased timeout for test print

      // Listen for any response from printer
      const dataHandler = (data) => {
        responseReceived = true;
        clearTimeout(responseTimeout);
        port.removeListener('data', dataHandler);
        port.removeListener('error', errorHandler);
        
        resolve({
          success: true,
          message: 'Printer responded successfully'
        });
      };

      // Listen for errors
      const errorHandler = (err) => {
        errorOccurred = true;
        clearTimeout(responseTimeout);
        port.removeListener('data', dataHandler);
        port.removeListener('error', errorHandler);
        
        const errorMessage = err?.message || err?.toString() || 'Unknown printer communication error';
        resolve({
          success: false,
          error: `Printer communication error: ${errorMessage}`
        });
      };

      port.on('data', dataHandler);
      port.on('error', errorHandler);

      if (printTestReceipt) {
        // Send a small test receipt that will actually print
        console.log('📤 Sending test print receipt');
        const testReceipt = 
          '\x1B\x40' +                    // ESC @ - Initialize printer
          '\x1B\x61\x01' +                // ESC a 1 - Center align
          '\x1B\x45\x01' +                // ESC E 1 - Bold on
          'PRINTER TEST\n' +
          '\x1B\x45\x00' +                // ESC E 0 - Bold off
          '\x1B\x61\x00' +                // ESC a 0 - Left align
          'Connection: OK\n' +
          'Port: ' + port.path + '\n' +
          'Time: ' + new Date().toLocaleTimeString() + '\n' +
          '\n\n\n' +                      // Feed some paper
          '\x1D\x56\x00';                 // GS V 0 - Cut paper
        
        port.write(testReceipt, (writeErr) => {
          if (writeErr) {
            errorOccurred = true;
            clearTimeout(responseTimeout);
            port.removeListener('data', dataHandler);
            port.removeListener('error', errorHandler);
            
            const writeErrorMessage = writeErr?.message || writeErr?.toString() || 'Unknown write error';
            resolve({
              success: false,
              error: `Failed to send test print: ${writeErrorMessage}`
            });
          } else {
            console.log('✅ Test receipt sent successfully');
            // For test print, we consider it successful if we can send the data
            // without waiting for electronic response
            setTimeout(() => {
              if (!errorOccurred) {
                responseReceived = true;
                clearTimeout(responseTimeout);
                port.removeListener('data', dataHandler);
                port.removeListener('error', errorHandler);
                resolve({
                  success: true,
                  message: 'Test receipt printed successfully'
                });
              }
            }, 2000); // Give time for print to complete
          }
        });
      } else {
        // Send printer status inquiry command (ESC/POS DLE EOT)
        // This command requests the printer status and most thermal printers will respond
        const statusCommand = Buffer.from([0x10, 0x04, 0x01]); // DLE EOT n (n=1 for printer status)
        
        port.write(statusCommand, (writeErr) => {
          if (writeErr) {
            errorOccurred = true;
            clearTimeout(responseTimeout);
            port.removeListener('data', dataHandler);
            port.removeListener('error', errorHandler);
            
            const writeErrorMessage = writeErr?.message || writeErr?.toString() || 'Unknown write error';
            resolve({
              success: false,
              error: `Failed to send test command: ${writeErrorMessage}`
            });
          } else {
            console.log('📤 Sent printer status inquiry command');
            
            // Also send a simple ESC @ (initialize printer) command as backup
            // Some printers respond better to this than status requests
            setTimeout(() => {
              if (!responseReceived && !errorOccurred) {
                console.log('📤 Sending backup initialization command');
                const initCommand = Buffer.from([0x1B, 0x40]); // ESC @
                port.write(initCommand, (initErr) => {
                  if (initErr) {
                    console.log('⚠️ Backup command failed:', initErr.message);
                  }
                });
              }
            }, 1000);
          }
        });
      }

      // Drain the write to ensure command is sent
      port.drain((drainErr) => {
        if (drainErr) {
          console.log('⚠️ Drain error (non-critical):', drainErr.message);
        }
      });
    });
  }

  // Close current connection
  async closeConnection() {
    if (this.persistentPort && this.persistentPort.isOpen) {
      return new Promise((resolve) => {
        this.paperMonitor.stopMonitoring();
        
        this.persistentPort.close((err) => {
          if (err) {
            console.log('Connection close error (ignored):', err.message);
          }
          this.persistentPort = null;
          resolve();
        });
      });
    }
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