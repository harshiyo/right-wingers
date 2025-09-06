import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrinterService } from './services/printerService.js';
import { DualPrinterService } from './services/dualPrinterService.js';
import { SerialPort } from 'serialport';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// Set up separate user data directory for multiple instances
if (process.env.USER_DATA_DIR) {
  const userDataPath = path.join(app.getPath('userData'), process.env.USER_DATA_DIR);
  app.setPath('userData', userDataPath);
  console.log(`Using user data directory: ${userDataPath}`);
}

// Initialize printer services
const printerService = new PrinterService();
const dualPrinterService = new DualPrinterService();

// Track which service is active
let isDualPrinterMode = false;
let currentStoreId = null;

// Declare mainWindow in global scope
let mainWindow;

// Set up event handlers
printerService.onPaperStatusChanged = (status) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('paper-status-changed', status);
  }
};

printerService.onPrintJobCompleted = (job) => {
  // Silent success
};

printerService.onPrintJobFailed = (job, error) => {
  // Silent failure
};

// Set up dual printer event handlers
dualPrinterService.onPaperStatusChanged = (status) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('dual-paper-status-changed', status);
  }
};

dualPrinterService.onPrintJobCompleted = (job) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('dual-print-job-completed', job);
  }
};

dualPrinterService.onPrintJobFailed = (job, error) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('dual-print-job-failed', { job, error: error.message });
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
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

  // IPC handlers for printer service
  ipcMain.handle('print-receipt', async (event, order, type, showPreview = false) => {
    const customerLines = printerService.receiptRenderer.renderReceipt(order, type);
    const kitchenLines = printerService.kitchenReceiptRenderer.renderKitchenReceipt(order, type);
    const storeId = order.storeId || 'hamilton'; // Default to hamilton for testing
    
    // If preview is explicitly requested, show both previews
    if (showPreview) {
      showReceiptPreview(customerLines, 'Customer Receipt');
      showReceiptPreview(kitchenLines, 'Kitchen Receipt');
      return { success: true, mode: 'preview' };
    }

    // Otherwise, print both receipts to thermal printer
    try {
      const result = await printerService.printReceipt(order, type);
      return { success: true, mode: 'thermal', ...result };
    } catch (err) {
      // Show error dialog to user
      dialog.showErrorBox('Print Error', `Failed to print receipts: ${err.message}`);
      
      // Also show preview as fallback
      showReceiptPreview(customerLines, 'Customer Receipt (Fallback)');
      showReceiptPreview(kitchenLines, 'Kitchen Receipt (Fallback)');
      
      return { success: false, mode: 'fallback', error: err.message };
    }
  });

  ipcMain.handle('check-paper-status', async () => {
    try {
      if (!printerService.persistentPort || !printerService.persistentPort.isOpen) {
        return {
          available: false,
          message: 'Printer not connected'
        };
      }

      const status = await printerService.paperMonitor.checkPaperStatus(printerService.persistentPort);
      
      return {
        available: true,
        paperStatus: status,
        message: status.paperOut 
          ? 'Paper roll is empty!' 
          : status.paperNearEnd 
          ? 'Paper level is low' 
          : 'Paper level OK'
      };
    } catch (error) {
      return {
        available: false,
        message: `Paper status check failed: ${error.message}`
      };
    }
  });

  ipcMain.handle('get-pending-queue', async () => {
    try {
      const pendingJobs = printerService.getPendingQueue();
      return {
        pendingJobs,
        paperStatus: printerService.paperMonitor.isPaperOut ? 'out' : printerService.paperMonitor.lastPaperStatus === 'low' ? 'low' : 'ok',
        activeJobs: printerService.printQueue.length
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

  ipcMain.handle('retry-pending-job', async (event, jobId) => {
    try {
      return printerService.retryPendingJob(jobId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('cancel-pending-job', async (event, jobId) => {
    try {
      return printerService.cancelPendingJob(jobId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('clear-pending-queue', async () => {
    try {
      return printerService.clearPendingQueue();
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('update-printer-settings', async (event, port, baudRate) => {
    try {
      console.log(`🔧 Updating printer settings: ${port} at ${baudRate} baud`);
      
      // Update printer service with new settings
      printerService.updateSettings(port, baudRate);
      
      return { success: true, message: 'Printer settings updated successfully' };
    } catch (error) {
      console.error('Error updating printer settings:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('test-printer-connection', async (event, port, baudRate, printTest = false) => {
    try {
      console.log(`🧪 Testing printer connection: ${port} at ${baudRate} baud${printTest ? ' (with test print)' : ''}`);
      
      // Test the connection with new settings
      const result = await printerService.testConnection(port, baudRate, printTest);
      
      let message;
      if (result.success) {
        message = result.message || 'Printer connection test successful';
      } else {
        message = result.error || result.message || 'Unknown connection error occurred';
      }
      
      return { 
        success: result.success, 
        message: message
      };
    } catch (error) {
      console.error('Error testing printer connection:', error);
      const errorMessage = error.message || error.toString() || 'Unknown error occurred during connection test';
      return { 
        success: false, 
        message: `Connection test failed: ${errorMessage}` 
      };
    }
  });

  // Dual Printer IPC Handlers
  ipcMain.handle('update-dual-printer-settings', async (event, config) => {
    try {
      console.log('🔧 Updating dual printer configuration');
      
      // Update dual printer service with new settings
      dualPrinterService.updateConfiguration(config);
      
      // Set the mode flag
      isDualPrinterMode = config.printerSettings?.enableDualPrinting || false;
      
      return { success: true, message: 'Dual printer settings updated successfully' };
    } catch (error) {
      console.error('Error updating dual printer settings:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('test-dual-printers', async (event, printTest = false) => {
    try {
      console.log(`🧪 Testing dual printers${printTest ? ' (with test prints)' : ''}`);
      
      const result = await dualPrinterService.testAllPrinters(printTest);
      
      return result;
    } catch (error) {
      console.error('Error testing dual printers:', error);
      return { 
        success: false, 
        results: {
          front: { success: false, error: error.message },
          kitchen: { success: false, error: error.message }
        }
      };
    }
  });

  ipcMain.handle('scan-printers', async () => {
    try {
      console.log('🔍 Scanning for printers...');
      
      const ports = await SerialPort.list();
      
      // Printer type detection patterns
      const PRINTER_PATTERNS = {
        thermal: {
          manufacturers: ['FTDI', 'Silicon Labs', 'Prolific', 'WCH.CN'],
          description: 'Thermal Receipt Printer'
        },
        impact: {
          manufacturers: ['Seiko Epson', 'EPSON', 'Star Micronics', 'Citizen'],
          description: 'Impact/Dot Matrix Printer'
        }
      };

      const detectedPrinters = ports.map(port => {
        let type = 'unknown';
        let confidence = 'low';
        
        if (port.manufacturer) {
          const manufacturer = port.manufacturer.toLowerCase();
          
          // Check for thermal printer patterns
          if (PRINTER_PATTERNS.thermal.manufacturers.some(m => 
            manufacturer.includes(m.toLowerCase()))) {
            type = 'thermal';
            confidence = 'high';
          }
          
          // Check for impact printer patterns
          if (PRINTER_PATTERNS.impact.manufacturers.some(m => 
            manufacturer.includes(m.toLowerCase()))) {
            type = 'impact';
            confidence = 'high';
          }
          
          // Check for Prolific (often used with thermal printers)
          if (manufacturer.includes('prolific')) {
            type = 'thermal';
            confidence = 'medium';
          }
        }
        
        return {
          path: port.path,
          manufacturer: port.manufacturer || 'Unknown',
          productId: port.productId,
          vendorId: port.vendorId,
          type,
          confidence,
          description: PRINTER_PATTERNS[type]?.description || 'Unknown Device'
        };
      });
      
      console.log(`📡 Found ${detectedPrinters.length} potential printers`);
      
      return { 
        success: true, 
        printers: detectedPrinters
      };
    } catch (error) {
      console.error('Error scanning printers:', error);
      return { 
        success: false, 
        printers: [],
        error: error.message
      };
    }
  });

  ipcMain.handle('print-receipt-dual', async (event, order, type, showPreview = false) => {
    try {
      console.log(`🖨️ Print request received: ${type}, Preview: ${showPreview}, Kitchen Only: ${order._kitchenOnly || false}`);
      console.log(`🔧 Dual printer mode: ${isDualPrinterMode ? 'Enabled' : 'Disabled'}`);
      
      // Use dual printer service if enabled, otherwise fall back to single printer
      if (isDualPrinterMode) {
        console.log('🖨️ Using dual printer mode');
        
        if (showPreview) {
          // Show previews based on what would actually print
          const isKitchenOnly = order._kitchenOnly === true;
          
          if (!isKitchenOnly) {
            const customerLines = dualPrinterService.receiptRenderer.renderReceipt(order, type);
            showReceiptPreview(customerLines, 'Customer Receipt (Front Printer)');
          }
          
          const kitchenLines = dualPrinterService.kitchenReceiptRenderer.renderKitchenReceipt(order, type);
          showReceiptPreview(kitchenLines, `Kitchen Receipt (${isDualPrinterMode ? 'Kitchen Printer' : 'Front Printer'})`);
          
          return { success: true, mode: 'preview' };
        }
        
        const result = await dualPrinterService.printReceipt(order, type);
        console.log(`✅ Dual printer result:`, result);
        return { success: true, mode: 'dual', ...result };
      } else {
        console.log('🖨️ Using single printer mode (legacy)');
        
        if (showPreview) {
          const isKitchenOnly = order._kitchenOnly === true;
          
          if (!isKitchenOnly) {
            const customerLines = printerService.receiptRenderer.renderReceipt(order, type);
            showReceiptPreview(customerLines, 'Customer Receipt');
          }
          
          const kitchenLines = printerService.kitchenReceiptRenderer.renderKitchenReceipt(order, type);
          showReceiptPreview(kitchenLines, 'Kitchen Receipt');
          
          return { success: true, mode: 'preview' };
        }
        
        const result = await printerService.printReceipt(order, type);
        return { success: true, mode: 'single', ...result };
      }
    } catch (error) {
      console.error('❌ Print error:', error);
      
      // Show error dialog
      dialog.showErrorBox('Print Error', `Failed to print receipts: ${error.message}`);
      
      // Show fallback previews based on what was requested
      const isKitchenOnly = order._kitchenOnly === true;
      
      if (!isKitchenOnly) {
        const customerLines = printerService.receiptRenderer.renderReceipt(order, type);
        showReceiptPreview(customerLines, 'Customer Receipt (Fallback)');
      }
      
      const kitchenLines = printerService.kitchenReceiptRenderer.renderKitchenReceipt(order, type);
      showReceiptPreview(kitchenLines, 'Kitchen Receipt (Fallback)');
      
      return { success: false, mode: 'fallback', error: error.message };
    }
  });

  ipcMain.handle('get-dual-printer-status', async () => {
    try {
      return {
        isDualMode: isDualPrinterMode,
        frontPrinter: {
          connected: dualPrinterService.frontPrinter.port?.isOpen || false,
          port: dualPrinterService.frontPrinter.config.port
        },
        kitchenPrinter: {
          connected: dualPrinterService.kitchenPrinter.port?.isOpen || false,
          port: dualPrinterService.kitchenPrinter.config.port
        },
        pendingJobs: dualPrinterService.getPendingQueue()
      };
    } catch (error) {
      return {
        isDualMode: false,
        error: error.message
      };
    }
  });

  // Handler to load dual printer settings from Firebase
  ipcMain.handle('load-dual-printer-settings', async (event, storeId, settings) => {
    try {
      console.log(`🔄 Loading dual printer settings for store: ${storeId}`);
      
      // Update current store
      currentStoreId = storeId;
      
      if (settings) {
        // Extract dual printer configuration
        const config = {
          frontPrinter: settings.frontPrinter || { 
            port: settings.printerPort || 'COM6', 
            baudRate: settings.printerBaudRate || 38400, 
            type: 'thermal' 
          },
          kitchenPrinter: settings.kitchenPrinter || { 
            port: 'COM7', 
            baudRate: 38400, 
            type: 'impact' 
          },
          printerSettings: {
            enableDualPrinting: settings.printerSettings?.enableDualPrinting || false,
            customerReceiptEnabled: settings.printerSettings?.customerReceiptEnabled ?? true,
            kitchenReceiptEnabled: settings.printerSettings?.kitchenReceiptEnabled ?? true,
            autoCutEnabled: settings.printerSettings?.autoCutEnabled ?? true,
            printDelay: settings.printerSettings?.printDelay || 500
          }
        };
        
        // Update dual printer service configuration
        dualPrinterService.updateConfiguration(config);
        
        // Update the mode flag
        isDualPrinterMode = config.printerSettings.enableDualPrinting;
        
        console.log(`✅ Dual printer settings loaded: ${isDualPrinterMode ? 'Enabled' : 'Disabled'}`);
        console.log(`📄 Front printer: ${config.frontPrinter.port} (${config.frontPrinter.type})`);
        console.log(`🍳 Kitchen printer: ${config.kitchenPrinter.port} (${config.kitchenPrinter.type})`);
        
        return { success: true, isDualMode: isDualPrinterMode };
      } else {
        console.log('⚠️ No settings found, using defaults');
        isDualPrinterMode = false;
        return { success: true, isDualMode: false };
      }
    } catch (error) {
      console.error('❌ Error loading dual printer settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Daily Sales Report Handler
  ipcMain.handle('print-daily-sales-report', async (event, reportData, storeName) => {
    try {
      // Generate report text
      const reportText = `
${storeName || 'Store'} - DAILY SALES REPORT
${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
========================================

ORDER SUMMARY:
- Total Orders: ${reportData.totalOrders}
- Delivery Orders: ${reportData.deliveryOrders} (${reportData.totalOrders > 0 ? ((reportData.deliveryOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%)
- Pickup Orders: ${reportData.pickupOrders} (${reportData.totalOrders > 0 ? ((reportData.pickupOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%)
- Cancelled Orders: ${reportData.cancelledOrders}

FINANCIAL SUMMARY:
- Gross Sales (with tax): $${reportData.grossSalesWithTax.toFixed(2)}
- Gross Sales (without tax): $${reportData.grossSalesWithoutTax.toFixed(2)}
- Total Tax Collected: $${reportData.totalTaxCollected.toFixed(2)}
- Average Order Value: $${reportData.averageOrderValue.toFixed(2)}

CUSTOMER INSIGHTS:
- Unique Customers: ${reportData.uniqueCustomers}
- First Order: ${reportData.firstOrderTime}
- Last Order: ${reportData.lastOrderTime}
- Peak Hour: ${reportData.peakHour}

ORDERS BY HOUR:
${Object.entries(reportData.ordersByHour || {})
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .map(([hour, count]) => `${hour}: ${count} orders`)
  .join('\n')}

========================================
Generated: ${new Date().toLocaleString()}
      `;

      // Try to print through thermal printer
      if (printerService.persistentPort && printerService.persistentPort.isOpen) {
        await printerService.printReport(reportText);
        return { success: true, mode: 'thermal' };
      } else {
        // Show preview if printer not available
        showReceiptPreview(reportText.split('\n'), 'Daily Sales Report');
        return { success: true, mode: 'preview' };
      }
    } catch (error) {
      // Show preview as fallback
      const reportLines = reportText.split('\n');
      showReceiptPreview(reportLines, 'Daily Sales Report (Fallback)');
      return { success: false, mode: 'fallback', error: error.message };
    }
  });

  // Custom Sales Report Handler
  ipcMain.handle('print-custom-sales-report', async (event, reportData, storeName, startDate, endDate) => {
    try {
      // Generate report text
      const reportText = `
${storeName || 'Store'} - CUSTOM SALES REPORT
Period: ${startDate} to ${endDate}
========================================

ORDER SUMMARY:
- Total Orders: ${reportData.totalOrders}
- Delivery Orders: ${reportData.deliveryOrders} (${reportData.totalOrders > 0 ? ((reportData.deliveryOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%)
- Pickup Orders: ${reportData.pickupOrders} (${reportData.totalOrders > 0 ? ((reportData.pickupOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%)
- Cancelled Orders: ${reportData.cancelledOrders}

FINANCIAL SUMMARY:
- Gross Sales (with tax): $${reportData.grossSalesWithTax.toFixed(2)}
- Gross Sales (without tax): $${reportData.grossSalesWithoutTax.toFixed(2)}
- Total Tax Collected: $${reportData.totalTaxCollected.toFixed(2)}
- Average Order Value: $${reportData.averageOrderValue.toFixed(2)}

CUSTOMER INSIGHTS:
- Unique Customers: ${reportData.uniqueCustomers}
- First Order: ${reportData.firstOrderTime}
- Last Order: ${reportData.lastOrderTime}
- Peak Hour: ${reportData.peakHour}

ORDERS BY HOUR:
${Object.entries(reportData.ordersByHour || {})
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .map(([hour, count]) => `${hour}: ${count} orders`)
  .join('\n')}

========================================
Generated: ${new Date().toLocaleString()}
      `;

      // Try to print through thermal printer
      if (printerService.persistentPort && printerService.persistentPort.isOpen) {
        await printerService.printReport(reportText);
        return { success: true, mode: 'thermal' };
      } else {
        // Show preview if printer not available
        showReceiptPreview(reportText.split('\n'), 'Custom Sales Report');
        return { success: true, mode: 'preview' };
      }
    } catch (error) {
      // Show preview as fallback
      const reportLines = reportText.split('\n');
      showReceiptPreview(reportLines, 'Custom Sales Report (Fallback)');
      return { success: false, mode: 'fallback', error: error.message };
    }
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
    // Use a unique port for each Electron instance to avoid conflicts
    const port = process.env.PORT || 3000;
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showReceiptPreview(lines, title = 'Receipt Preview') {
  // Create a new window for receipt preview
  const previewWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: title,
    resizable: true,
    minimizable: true,
    maximizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  // Convert lines to HTML with proper formatting
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt Preview</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.2;
          margin: 20px;
          background: white;
          color: black;
        }
        .receipt {
          white-space: pre-wrap;
          word-wrap: break-word;
          max-width: 100%;
        }
        .receipt strong {
          font-weight: bold;
        }
        @media print {
          body { margin: 0; }
          .receipt { font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">${lines.map(line => {
        // Convert ESC/POS bold commands to HTML
        if (line.includes('\x1B\x45\x01')) {
          line = line.replace(/\x1B\x45\x01(.*?)\x1B\x45\x00/g, '<strong>$1</strong>');
        }
        return line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }).join('\n')}</div>
    </body>
    </html>
  `;

  previewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Cleanup printer services
  printerService.cleanup();
  dualPrinterService.cleanup();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});
