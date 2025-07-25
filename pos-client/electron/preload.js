const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (order, type) => ipcRenderer.invoke('print-receipt', order, type),
  printDailySalesReport: (reportData, storeName) => ipcRenderer.invoke('print-daily-sales-report', reportData, storeName),
  printCustomSalesReport: (reportData, storeName, startDate, endDate) => ipcRenderer.invoke('print-custom-sales-report', reportData, storeName, startDate, endDate),
  onShowDailySalesReport: (callback) => ipcRenderer.on('show-daily-sales-report', callback),
  onShowCustomSalesReport: (callback) => ipcRenderer.on('show-custom-sales-report', callback)
});