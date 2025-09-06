import { Order } from './types';

declare global {
  interface Window {
    electronAPI?: {
      // Legacy single printer API
      printReceipt: (order: any, type: string) => Promise<void>;
      // New dual printer API
      printReceiptDual: (order: any, type: string, showPreview?: boolean) => Promise<{ success: boolean; mode: string; }>;
      getDualPrinterStatus: () => Promise<{ isDualMode: boolean; error?: string; }>;
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

  if (!window.electronAPI) {
    console.error('Electron API not available');
    return false;
  }

  try {
    // Check if dual printer mode is enabled
    let isDualMode = false;
    
    if (typeof window.electronAPI.getDualPrinterStatus === 'function') {
      try {
        const status = await window.electronAPI.getDualPrinterStatus();
        isDualMode = status.isDualMode;
        console.log(`🖨️ Printer mode: ${isDualMode ? 'Dual' : 'Single'}`);
      } catch (err) {
        console.warn('Could not get dual printer status, falling back to single printer mode');
      }
    }

    // Use appropriate API based on mode
    if (isDualMode && typeof window.electronAPI.printReceiptDual === 'function') {
      console.log('📄 Using dual printer API');
      const result = await window.electronAPI.printReceiptDual(order, type, false);
      
      if (result.success) {
        console.log(`✅ Dual print completed in ${result.mode} mode`);
        return true;
      } else {
        console.warn('Dual printer failed, falling back to single printer');
        // Fall through to legacy API
      }
    }

    // Fallback to legacy single printer API
    if (typeof window.electronAPI.printReceipt === 'function') {
      console.log('📄 Using legacy single printer API');
      await window.electronAPI.printReceipt(order, type);
      return true;
    } else {
      console.error('No printer API available');
      return false;
    }
    
  } catch (err) {
    console.error('Failed to print receipt:', err);
    return false;
  }
}
