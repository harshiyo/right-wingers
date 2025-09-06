const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Legacy single printer APIs
  printReceipt: (order, type) => ipcRenderer.invoke('print-receipt', order, type),
  updatePrinterSettings: (port, baudRate) => ipcRenderer.invoke('update-printer-settings', port, baudRate),
  testPrinterConnection: (port, baudRate, printTest) => ipcRenderer.invoke('test-printer-connection', port, baudRate, printTest),
  
  // Dual printer APIs
  printReceiptDual: (order, type, showPreview) => ipcRenderer.invoke('print-receipt-dual', order, type, showPreview),
  updateDualPrinterSettings: (config) => ipcRenderer.invoke('update-dual-printer-settings', config),
  testDualPrinters: (printTest) => ipcRenderer.invoke('test-dual-printers', printTest),
  scanPrinters: () => ipcRenderer.invoke('scan-printers'),
  getDualPrinterStatus: () => ipcRenderer.invoke('get-dual-printer-status'),
  loadDualPrinterSettings: (storeId, settings) => ipcRenderer.invoke('load-dual-printer-settings', storeId, settings),
  
  // Dual printer event listeners
  onDualPaperStatusChanged: (callback) => ipcRenderer.on('dual-paper-status-changed', callback),
  onDualPrintJobCompleted: (callback) => ipcRenderer.on('dual-print-job-completed', callback),
  onDualPrintJobFailed: (callback) => ipcRenderer.on('dual-print-job-failed', callback),
  removeDualPaperStatusListener: (callback) => ipcRenderer.removeListener('dual-paper-status-changed', callback),
  removeDualPrintJobCompletedListener: (callback) => ipcRenderer.removeListener('dual-print-job-completed', callback),
  removeDualPrintJobFailedListener: (callback) => ipcRenderer.removeListener('dual-print-job-failed', callback),
  
  // Reports
  printDailySalesReport: (reportData, storeName) => ipcRenderer.invoke('print-daily-sales-report', reportData, storeName),
  printCustomSalesReport: (reportData, storeName, startDate, endDate) => ipcRenderer.invoke('print-custom-sales-report', reportData, storeName, startDate, endDate),
  onShowDailySalesReport: (callback) => ipcRenderer.on('show-daily-sales-report', callback),
  onShowCustomSalesReport: (callback) => ipcRenderer.on('show-custom-sales-report', callback),
  
  // Paper status (legacy)
  checkPaperStatus: () => ipcRenderer.invoke('check-paper-status'),
  onPaperStatusChanged: (callback) => ipcRenderer.on('paper-status-changed', callback),
  removePaperStatusListener: (callback) => ipcRenderer.removeListener('paper-status-changed', callback),
  
  // Print queue management
  getPendingQueue: () => ipcRenderer.invoke('get-pending-queue'),
  retryPendingJob: (jobId) => ipcRenderer.invoke('retry-pending-job', jobId),
  cancelPendingJob: (jobId) => ipcRenderer.invoke('cancel-pending-job', jobId),
  clearPendingQueue: () => ipcRenderer.invoke('clear-pending-queue')
});