import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';

interface PendingJob {
  id: string;
  orderData: {
    order: any;
    type: string;
  };
  createdAt: string;
  retryCount: number;
  originalError?: string;
}

interface PendingQueueDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendingQueueDialog: React.FC<PendingQueueDialogProps> = ({ isOpen, onClose }) => {
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [paperStatus, setPaperStatus] = useState<'ok' | 'out' | 'low'>('ok');

  useEffect(() => {
    if (!isOpen) return;

    // Fetch pending queue data
    const fetchPendingQueue = async () => {
      if ((window as any).electronAPI?.getPendingQueue) {
        try {
          const queueData = await (window as any).electronAPI.getPendingQueue();
          setPendingJobs(queueData.pendingJobs || []);
          setPaperStatus(queueData.paperStatus || 'ok');
        } catch (error) {
          console.error('Failed to fetch pending queue:', error);
        }
      } else {
        // Mock data for development/testing
        setPendingJobs([
          {
            id: 'job_1_1234567890',
            orderData: {
              order: { id: 'order_001', customerInfo: { name: 'John Doe' }, total: 25.99 },
              type: 'new'
            },
            createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
            retryCount: 1,
            originalError: 'Paper out'
          },
          {
            id: 'job_2_1234567891',
            orderData: {
              order: { id: 'order_002', customerInfo: { name: 'Jane Smith' }, total: 18.50 },
              type: 'reprint'
            },
            createdAt: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
            retryCount: 0
          }
        ]);
        setPaperStatus('out');
      }
    };

    fetchPendingQueue();

    // Refresh every 5 seconds while dialog is open
    const interval = setInterval(fetchPendingQueue, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const getJobTypeDisplay = (type: string) => {
    switch (type) {
      case 'new': return '🆕 New Order';
      case 'reprint': return '🔄 Reprint';
      case 'modified': return '✏️ Modified';
      default: return '📄 Print Job';
    }
  };

  const handleRetryJob = async (jobId: string) => {
    if ((window as any).electronAPI?.retryPendingJob) {
      try {
        await (window as any).electronAPI.retryPendingJob(jobId);
        // Refresh the queue
        const queueData = await (window as any).electronAPI.getPendingQueue();
        setPendingJobs(queueData.pendingJobs || []);
      } catch (error) {
        console.error('Failed to retry job:', error);
      }
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if ((window as any).electronAPI?.cancelPendingJob) {
      try {
        await (window as any).electronAPI.cancelPendingJob(jobId);
        // Refresh the queue
        const queueData = await (window as any).electronAPI.getPendingQueue();
        setPendingJobs(queueData.pendingJobs || []);
      } catch (error) {
        console.error('Failed to cancel job:', error);
      }
    }
  };

  const handleClearAllPending = async () => {
    if (confirm('Are you sure you want to cancel all pending print jobs?')) {
      if ((window as any).electronAPI?.clearPendingQueue) {
        try {
          await (window as any).electronAPI.clearPendingQueue();
          setPendingJobs([]);
        } catch (error) {
          console.error('Failed to clear pending queue:', error);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Dialog */}
      <div className="relative bg-white max-w-4xl w-full mx-4 rounded-lg shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              paperStatus === 'out' ? 'bg-red-500' : 
              paperStatus === 'low' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <h2 className="text-xl font-semibold text-gray-900">
              Pending Print Queue
            </h2>
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
              {pendingJobs.length} jobs
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Status Banner */}
        {paperStatus === 'out' && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4 rounded">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Paper roll is empty
                </p>
                <p className="text-sm text-red-700">
                  Replace paper to automatically resume all pending jobs
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Job List */}
        <div className="flex-1 overflow-y-auto p-6">
          {pendingJobs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending jobs</h3>
              <p className="text-gray-500">All print jobs are processing normally</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingJobs.map((job) => (
                <div key={job.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {getJobTypeDisplay(job.orderData.type)}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {job.id}
                        </span>
                        {job.retryCount > 0 && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                            Retry #{job.retryCount}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Customer:</span> {job.orderData.order.customerInfo?.name || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Total:</span> ${job.orderData.order.total?.toFixed(2) || '0.00'}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {formatTimeAgo(job.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">Order ID:</span> {job.orderData.order.id || 'N/A'}
                        </div>
                      </div>

                      {job.originalError && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          Error: {job.originalError}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleRetryJob(job.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Retry this job"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCancelJob(job.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Cancel this job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {pendingJobs.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {pendingJobs.length} job{pendingJobs.length !== 1 ? 's' : ''} waiting for paper replacement
              </div>
              <button
                onClick={handleClearAllPending}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Cancel All Jobs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};