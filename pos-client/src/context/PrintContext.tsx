import React, { createContext, useContext, useEffect } from 'react';
import { syncAndPrintOrders } from '../services/sync.service';

const PrintContext = createContext({});

export const PrintProvider: React.FC<{ storeId: string }> = ({ storeId, children }) => {
  useEffect(() => {
    syncAndPrintOrders(storeId);
  }, [storeId]);
  return <PrintContext.Provider value={{}}>{children}</PrintContext.Provider>;
};

export function usePrint() {
  return useContext(PrintContext);
} 