import React, { useState, useEffect } from 'react';
import { CustomSalesReport } from './CustomSalesReport';

declare global {
  interface Window {
    electronAPI?: {
      onShowCustomSalesReport: (callback: () => void) => void;
    };
  }
}

export const MenuTriggeredCustomReport: React.FC = () => {
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    // Listen for the electron menu event
    if (window.electronAPI && typeof window.electronAPI.onShowCustomSalesReport === 'function') {
      window.electronAPI.onShowCustomSalesReport(() => {
        setShowReport(true);
      });
    }
  }, []);

  return (
    <CustomSalesReport 
      open={showReport} 
      onClose={() => setShowReport(false)} 
    />
  );
}; 