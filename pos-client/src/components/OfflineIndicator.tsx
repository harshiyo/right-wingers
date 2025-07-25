import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

// Simple offline banner that appears above TopBar
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show when offline
  if (isOnline) return null;

  return (
    <div className="w-full bg-red-600 text-white px-4 py-2 text-center text-sm font-medium sticky top-0 z-50">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>Offline Mode - Orders will sync when connection is restored</span>
      </div>
    </div>
  );
};

// Remove the OfflineBanner component since we're not using it
export const OfflineBanner: React.FC = () => {
  return null;
}; 