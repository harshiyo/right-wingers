import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrinterService } from './services/printerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// Set up separate user data directory for multiple instances
if (process.env.USER_DATA_DIR) {
  const userDataPath = path.join(app.getPath('userData'), process.env.USER_DATA_DIR);
  app.setPath('userData', userDataPath);
  console.log(`Using user data directory: ${userDataPath}`);
}

// Initialize printer service
const printerService = new PrinterService();

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

  // IPC handlers for printer service
  ipcMain.handle('print-receipt', async (event, order, type, showPreview = true) => {
    const lines = printerService.receiptRenderer.renderReceipt(order, type);
    const storeId = order.storeId || 'hamilton'; // Default to hamilton for testing
    
    console.log(`🖨️ Print request: store=${storeId}, type=${type}, showPreview=${showPreview}`);
    
    // If preview is explicitly requested, show it
    if (showPreview) {
      console.log('📄 Showing preview window as requested');
      showReceiptPreview(lines);
      return { success: true, mode: 'preview' };
    }

    // Otherwise, print to thermal printer
    try {
      const result = await printerService.printReceipt(order, type);
      return { success: true, mode: 'thermal', ...result };
    } catch (err) {
      console.error('Printing failed:', err.message);
      
      // Show error dialog to user
      dialog.showErrorBox('Print Error', `Failed to print receipt: ${err.message}`);
      
      // Also show preview as fallback
      showReceiptPreview(lines);
      
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

  ipcMain.handle('update-printer-settings', async (event, settings) => {
    try {
      // For now, just return success - settings will be handled later
      return { success: true, message: 'Settings updated' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('test-printer-connection', async (event, settings) => {
    try {
      // For now, just return success - testing will be handled later
      return { success: true, message: 'Connection test successful' };
    } catch (error) {
      return { success: false, message: error.message };
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

function showReceiptPreview(lines) {
  // Create a new window for receipt preview
  const previewWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: 'Receipt Preview',
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
  // Cleanup printer service
  printerService.cleanup();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});
