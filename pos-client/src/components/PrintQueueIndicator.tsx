import React, { useState, useEffect } from 'react';
import { PendingQueueDialog } from './PendingQueueDialog';

interface PaperStatusEvent {
  status: 'out' | 'ok' | 'low';
  message: string;
  pendingJobs?: number;
  resumedJobs?: number;
}

export const PrintQueueIndicator: React.FC = () => {
  const [pendingJobs, setPendingJobs] = useState(0);
  const [paperStatus, setPaperStatus] = useState<'ok' | 'out' | 'low'>('ok');
  const [showQueueDialog, setShowQueueDialog] = useState(false);

  useEffect(() => {
    if (!(window as any).electronAPI?.onPaperStatusChanged) {
      return; // Not in Electron environment
    }

    const handlePaperStatusChanged = (_event: any, data: PaperStatusEvent) => {
      setPaperStatus(data.status);
      if (data.pendingJobs !== undefined) {
        setPendingJobs(data.pendingJobs);
      }
      if (data.status === 'ok' && data.resumedJobs !== undefined) {
        setPendingJobs(0); // Clear pending jobs when resumed
      }
    };

    // Listen for paper status changes
    (window as any).electronAPI.onPaperStatusChanged(handlePaperStatusChanged);

    // Cleanup listener on unmount
    return () => {
      if ((window as any).electronAPI?.removePaperStatusListener) {
        (window as any).electronAPI.removePaperStatusListener(handlePaperStatusChanged);
      }
    };
  }, []);

  // Don't show anything if no pending jobs and status is OK
  if (pendingJobs === 0 && paperStatus === 'ok') {
    return null;
  }

  const getStatusColor = () => {
    switch (paperStatus) {
      case 'out':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'low':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'ok':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    if (pendingJobs > 0) {
      return '📋';
    }
    switch (paperStatus) {
      case 'out':
        return '🚨';
      case 'low':
        return '⚠️';
      case 'ok':
        return '✅';
      default:
        return '📄';
    }
  };

  const getStatusText = () => {
    if (pendingJobs > 0) {
      return `${pendingJobs} job${pendingJobs !== 1 ? 's' : ''} pending`;
    }
    switch (paperStatus) {
      case 'out':
        return 'Paper out';
      case 'low':
        return 'Paper low';
      case 'ok':
        return 'Printer OK';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      <div 
        className={`
          fixed bottom-4 right-4 z-40
          px-3 py-2 rounded-lg shadow-lg border-2 text-sm font-medium
          ${getStatusColor()}
          ${pendingJobs > 0 ? 'animate-pulse cursor-pointer hover:shadow-xl' : ''}
          transition-all duration-200
        `}
        onClick={() => pendingJobs > 0 && setShowQueueDialog(true)}
        title={pendingJobs > 0 ? 'Click to view pending jobs' : undefined}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <div>
            <div className="font-semibold">{getStatusText()}</div>
            {pendingJobs > 0 && (
              <div className="text-xs opacity-75">
                Click to view details
              </div>
            )}
          </div>
        </div>
      </div>

      <PendingQueueDialog
        isOpen={showQueueDialog}
        onClose={() => setShowQueueDialog(false)}
      />
    </>
  );
};