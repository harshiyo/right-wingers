export class PaperStatusMonitor {
  constructor(printerService) {
    this.printerService = printerService;
    this.paperStatusInterval = null;
    this.lastPaperStatus = 'unknown';
    this.isPaperOut = false;
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
            this.printerService.queueManager.resumePendingJobs();
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

  startMonitoring(port) {
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

  stopMonitoring() {
    if (this.paperStatusInterval) {
      clearInterval(this.paperStatusInterval);
      this.paperStatusInterval = null;
    }
  }

  sendPaperOutNotification() {
    if (this.printerService.onPaperStatusChanged) {
      this.printerService.onPaperStatusChanged({ paperOut: true });
    }
  }
}
