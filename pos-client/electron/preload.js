const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (order, type) => ipcRenderer.invoke('print-receipt', order, type),
  printDailySalesReport: (reportData, storeName) => ipcRenderer.invoke('print-daily-sales-report', reportData, storeName),
  printCustomSalesReport: (reportData, storeName, startDate, endDate) => ipcRenderer.invoke('print-custom-sales-report', reportData, storeName, startDate, endDate),
  onShowDailySalesReport: (callback) => ipcRenderer.on('show-daily-sales-report', callback),
  onShowCustomSalesReport: (callback) => ipcRenderer.on('show-custom-sales-report', callback),
  checkPaperStatus: () => ipcRenderer.invoke('check-paper-status'),
  onPaperStatusChanged: (callback) => ipcRenderer.on('paper-status-changed', callback),
  removePaperStatusListener: (callback) => ipcRenderer.removeListener('paper-status-changed', callback),
  getPendingQueue: () => ipcRenderer.invoke('get-pending-queue'),
  retryPendingJob: (jobId) => ipcRenderer.invoke('retry-pending-job', jobId),
  cancelPendingJob: (jobId) => ipcRenderer.invoke('cancel-pending-job', jobId),
  clearPendingQueue: () => ipcRenderer.invoke('clear-pending-queue')
});