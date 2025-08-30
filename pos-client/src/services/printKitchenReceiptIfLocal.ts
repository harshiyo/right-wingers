import { Order } from './types';

declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (order: any, type: string) => Promise<void>;
      updatePrinterSettings: (port: string, baudRate: number) => Promise<void>;
      testPrinterConnection: (port: string, baudRate: number, printTest?: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
    };
  }
}

export async function printKitchenReceiptIfLocal(
  order: Order,
  currentStoreId: string,
  type: 'new' | 'reprint' | 'modified-partial' | 'modified-full'
): Promise<boolean> {
  if (order.storeId !== currentStoreId) {
    return false;
  }

  if (!window.electronAPI || typeof window.electronAPI.printReceipt !== 'function') {
    return false;
  }

  try {
    // Create a modified order object that indicates kitchen-only printing
    const kitchenOrder = {
      ...order,
      _kitchenOnly: true
    };
    
    await window.electronAPI.printReceipt(kitchenOrder, type);
    return true;
  } catch (err) {
    return false;
  }
}
