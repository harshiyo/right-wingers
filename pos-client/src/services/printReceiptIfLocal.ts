import { Order } from './types';

declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (order: Order, type: string) => Promise<void>;
    };
  }
}

export async function printReceiptIfLocal(
  order: Order,
  currentStoreId: string,
  type: 'new' | 'reprint' | 'modified-partial' | 'modified-full'
): Promise<boolean> {
  if (order.storeId !== currentStoreId) {
    console.warn(`Print skipped: Order store (${order.storeId}) does not match current store (${currentStoreId})`);
    return false;
  }

  if (!window.electronAPI || typeof window.electronAPI.printReceipt !== 'function') {
    console.error('Electron printReceipt API not available');
    return false;
  }

  try {
    const success = await window.electronAPI.printReceipt(order, type);
    if (!success) {
      console.warn('Receipt fallback preview was shown instead of actual print');
    }
    return true;
  } catch (err) {
    console.error('Failed to print receipt:', err);
    return false;
  }
}
