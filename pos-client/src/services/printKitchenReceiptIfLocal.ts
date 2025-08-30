import { Order } from './types';

declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (order: Order, type: string) => Promise<void>;
    };
  }
}

export async function printKitchenReceiptIfLocal(
  order: Order,
  currentStoreId: string,
  type: 'new' | 'reprint' | 'modified-partial' | 'modified-full'
): Promise<boolean> {
  if (order.storeId !== currentStoreId) {
    console.warn(`Kitchen receipt print skipped: Order store (${order.storeId}) does not match current store (${currentStoreId})`);
    return false;
  }

  if (!window.electronAPI || typeof window.electronAPI.printReceipt !== 'function') {
    console.error('Electron printReceipt API not available for kitchen receipt');
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
    console.error('Failed to print kitchen receipt:', err);
    return false;
  }
}
