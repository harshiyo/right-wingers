export class PaperStatusMonitor {
  constructor(printerService) {
    this.printerService = printerService;
    this.paperStatusInterval = null;
    this.lastPaperStatus = 'unknown';
    this.isPaperOut = false;
    this.notificationSent = false; // Track if we've already sent a notification
  }

  async checkPaperStatus(port) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Clean up listener on timeout
        port.removeListener('data', onData);
        port.removeListener('error', onError);
        resolve({ paperOut: false, offline: false });
      }, 2000);
      
      const onData = (data) => {
        clearTimeout(timeout);
        port.removeListener('data', onData);
        port.removeListener('error', onError);
        
        if (data.length > 0) {
          const statusByte = data[0];
          const status = this.parsePaperStatus(statusByte);
          this.lastPaperStatus = status;
          
          if (status.paperOut) {
            // Only send notification once until paper is restored
            if (!this.isPaperOut || !this.notificationSent) {
              this.isPaperOut = true;
              this.notificationSent = true;
              this.sendPaperOutNotification();
            }
          } else if (status.paperNearEnd) {
            // Only send low paper notification once
            if (this.isPaperOut || !this.notificationSent) {
              this.isPaperOut = false;
              this.notificationSent = true;
              this.sendPaperLowNotification();
            }
          } else {
            // Paper is OK
            if (this.isPaperOut || this.notificationSent) {
              // Paper was out/low but now it's OK - send OK notification and resume jobs
              this.isPaperOut = false;
              this.notificationSent = false; // Reset notification flag
              this.sendPaperOkNotification();
              this.printerService.queueManager.resumePendingJobs();
            }
          }
          
          resolve(status);
        } else {
          resolve({ paperOut: false, offline: false });
        }
      };
      
      const onError = (error) => {
        clearTimeout(timeout);
        port.removeListener('data', onData);
        port.removeListener('error', onError);
        resolve({ paperOut: false, offline: true });
      };
      
      // Add listeners
      port.on('data', onData);
      port.on('error', onError);
      
      // Send status request command
      try {
        port.write('\x10\x04\x04'); // DLE EOT 4 command
      } catch (writeError) {
        clearTimeout(timeout);
        port.removeListener('data', onData);
        port.removeListener('error', onError);
        resolve({ paperOut: false, offline: true });
      }
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
      this.printerService.onPaperStatusChanged({ 
        status: 'out',
        message: 'Paper roll is empty! Please replace the paper roll to continue printing.',
        paperOut: true 
      });
    }
  }

  sendPaperLowNotification() {
    if (this.printerService.onPaperStatusChanged) {
      this.printerService.onPaperStatusChanged({ 
        status: 'low',
        message: 'Paper level is low. Consider replacing the paper roll soon.',
        paperNearEnd: true 
      });
    }
  }

  sendPaperOkNotification() {
    if (this.printerService.onPaperStatusChanged) {
      this.printerService.onPaperStatusChanged({ 
        status: 'ok',
        message: 'Paper level is OK. Printer ready.',
        paperOut: false,
        paperNearEnd: false 
      });
    }
  }

  // Allow manual acknowledgment of paper status (resets notification flag)
  acknowledgeNotification() {
    this.notificationSent = false;
  }
}
