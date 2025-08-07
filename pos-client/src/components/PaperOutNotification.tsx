import React, { useState, useEffect } from 'react';

interface PaperStatusEvent {
  status: 'out' | 'ok' | 'low';
  message: string;
  pendingJobs?: number;
  resumedJobs?: number;
}

export const PaperOutNotification: React.FC = () => {
  const [notification, setNotification] = useState<PaperStatusEvent | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!(window as any).electronAPI?.onPaperStatusChanged) {
      return; // Not in Electron environment
    }

    const handlePaperStatusChanged = (_event: any, data: PaperStatusEvent) => {
      setNotification(data);
      setShowNotification(true);

      // Auto-hide success messages after 5 seconds
      if (data.status === 'ok') {
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
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

  const handleDismiss = () => {
    setShowNotification(false);
  };

  const getNotificationStyle = () => {
    if (!notification) return '';
    
    switch (notification.status) {
      case 'out':
        return 'bg-red-50 border-red-500 text-red-900';
      case 'ok':
        return 'bg-green-50 border-green-500 text-green-900';
      case 'low':
        return 'bg-yellow-50 border-yellow-500 text-yellow-900';
      default:
        return 'bg-gray-50 border-gray-500 text-gray-900';
    }
  };

  const getIcon = () => {
    if (!notification) return '📄';
    
    switch (notification.status) {
      case 'out':
        return '🚨';
      case 'ok':
        return '✅';
      case 'low':
        return '⚠️';
      default:
        return '📄';
    }
  };

  const getTitle = () => {
    if (!notification) return '';
    
    switch (notification.status) {
      case 'out':
        return 'Paper Roll Empty';
      case 'ok':
        return 'Print Jobs Resumed';
      case 'low':
        return 'Paper Running Low';
      default:
        return 'Printer Status';
    }
  };

  if (!showNotification || !notification) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Notification Modal */}
      <div className={`
        relative max-w-md w-full mx-4 rounded-lg border-l-4 p-6 shadow-2xl
        ${getNotificationStyle()}
        transform transition-all duration-300 ease-out
        scale-100 opacity-100
      `}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-3xl">{getIcon()}</span>
            </div>
            
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold mb-2">
                {getTitle()}
              </h3>
              
              <p className="text-sm mb-4">
                {notification.message}
              </p>
              
              {notification.pendingJobs !== undefined && notification.pendingJobs > 0 && (
                <div className="bg-white bg-opacity-50 rounded p-3 mb-4">
                  <div className="text-sm font-medium">
                    📋 {notification.pendingJobs} print job{notification.pendingJobs !== 1 ? 's' : ''} waiting
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    Jobs will automatically resume when paper is replaced
                  </div>
                </div>
              )}
              
              {notification.resumedJobs !== undefined && notification.resumedJobs > 0 && (
                <div className="bg-white bg-opacity-50 rounded p-3 mb-4">
                  <div className="text-sm font-medium">
                    🔄 {notification.resumedJobs} print job{notification.resumedJobs !== 1 ? 's' : ''} resumed
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    Print queue is now processing normally
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                {notification.status === 'out' && (
                  <button
                    onClick={() => setShowNotification(false)}
                    className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded font-medium text-sm transition-colors"
                  >
                    Minimize
                  </button>
                )}
                
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded font-medium text-sm transition-colors"
                >
                  {notification.status === 'out' ? 'Got It' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};