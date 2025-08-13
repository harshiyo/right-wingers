export class PrintQueueManager {
  constructor(printerService) {
    this.printerService = printerService;
  }

  resumePendingJobs() {
    if (this.printerService.pendingQueue.length > 0 && !this.printerService.paperMonitor.isPaperOut) {
      while (this.printerService.pendingQueue.length > 0) {
        const job = this.printerService.pendingQueue.shift();
        job.status = 'pending';
        job.retryCount = 0;
        this.printerService.printQueue.push(job);
      }
      
      if (!this.printerService.isProcessingQueue) {
        this.printerService.processPrintQueue();
      }
    }
  }

  retryPendingJob(jobId) {
    const job = this.printerService.pendingQueue.find(j => j.id === jobId);
    if (job) {
      this.printerService.pendingQueue = this.printerService.pendingQueue.filter(j => j.id !== jobId);
      job.status = 'pending';
      job.retryCount = 0;
      this.printerService.printQueue.push(job);
      
      if (!this.printerService.isProcessingQueue) {
        this.printerService.processPrintQueue();
      }
      return { success: true };
    }
    return { success: false, message: 'Job not found' };
  }

  cancelPendingJob(jobId) {
    const job = this.printerService.pendingQueue.find(j => j.id === jobId);
    if (job) {
      this.printerService.pendingQueue = this.printerService.pendingQueue.filter(j => j.id !== jobId);
      return { success: true };
    }
    return { success: false, message: 'Job not found' };
  }

  clearPendingQueue() {
    this.printerService.pendingQueue.length = 0;
    return { success: true };
  }
}
