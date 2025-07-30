import React, { useState, useEffect } from 'react';

interface PaperStatus {
  paperOk: boolean;
  paperNearEnd: boolean;
  paperOut: boolean;
  error: boolean;
  offline: boolean;
  rawStatus: number;
}

interface PaperStatusResponse {
  available: boolean;
  paperStatus?: PaperStatus;
  message: string;
}

export const PaperStatusIndicator: React.FC = () => {
  const [paperStatus, setPaperStatus] = useState<PaperStatusResponse | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkPaperStatus = async () => {
    if ((window as any).electronAPI?.checkPaperStatus) {
      try {
        const status = await (window as any).electronAPI.checkPaperStatus();
        setPaperStatus(status);
        setLastChecked(new Date());
      } catch (error) {
        console.error('Failed to check paper status:', error);
        setPaperStatus({
          available: false,
          message: 'Failed to check paper status'
        });
      }
    } else {
      setPaperStatus({
        available: false,
        message: 'Paper status not available (web mode)'
      });
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkPaperStatus();

    // Check every 30 seconds
    const interval = setInterval(checkPaperStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!paperStatus || !paperStatus.available) {
    return null; // Don't show anything if not available
  }

  const getStatusColor = () => {
    if (!paperStatus.paperStatus) return 'gray';
    
    if (paperStatus.paperStatus.paperOut) return 'red';
    if (paperStatus.paperStatus.paperNearEnd) return 'yellow';
    if (paperStatus.paperStatus.error || paperStatus.paperStatus.offline) return 'orange';
    return 'green';
  };

  const getStatusIcon = () => {
    if (!paperStatus.paperStatus) return '📄';
    
    if (paperStatus.paperStatus.paperOut) return '🚨';
    if (paperStatus.paperStatus.paperNearEnd) return '⚠️';
    if (paperStatus.paperStatus.error) return '❌';
    if (paperStatus.paperStatus.offline) return '🔌';
    return '✅';
  };

  const getStatusText = () => {
    if (!paperStatus.paperStatus) return 'Unknown';
    
    if (paperStatus.paperStatus.paperOut) return 'Paper Out';
    if (paperStatus.paperStatus.paperNearEnd) return 'Paper Low';
    if (paperStatus.paperStatus.error) return 'Printer Error';
    if (paperStatus.paperStatus.offline) return 'Offline';
    return 'Paper OK';
  };

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();
  const statusText = getStatusText();

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 
        px-3 py-2 rounded-lg shadow-lg 
        border-2 text-sm font-medium
        cursor-pointer hover:shadow-xl transition-all
        ${statusColor === 'red' ? 'bg-red-50 border-red-300 text-red-800' : ''}
        ${statusColor === 'yellow' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : ''}
        ${statusColor === 'orange' ? 'bg-orange-50 border-orange-300 text-orange-800' : ''}
        ${statusColor === 'green' ? 'bg-green-50 border-green-300 text-green-800' : ''}
        ${statusColor === 'gray' ? 'bg-gray-50 border-gray-300 text-gray-800' : ''}
      `}
      onClick={checkPaperStatus}
      title={`Click to refresh • Last checked: ${lastChecked?.toLocaleTimeString() || 'Never'}`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-lg">{statusIcon}</span>
        <div>
          <div className="font-semibold">{statusText}</div>
          <div className="text-xs opacity-75">
            {lastChecked ? `${lastChecked.toLocaleTimeString()}` : 'Checking...'}
          </div>
        </div>
      </div>
    </div>
  );
};