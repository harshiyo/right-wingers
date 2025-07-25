import React, { useState, useEffect } from 'react';
import { DailySalesReport } from './DailySalesReport';

declare global {
  interface Window {
    electronAPI?: {
      onShowDailySalesReport: (callback: () => void) => void;
    };
  }
}

export const MenuTriggeredDailyReport: React.FC = () => {
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    // Listen for the electron menu event
    if (window.electronAPI && typeof window.electronAPI.onShowDailySalesReport === 'function') {
      window.electronAPI.onShowDailySalesReport(() => {
        setShowReport(true);
      });
    }
  }, []);

  return (
    <DailySalesReport 
      open={showReport} 
      onClose={() => setShowReport(false)} 
    />
  );
}; 