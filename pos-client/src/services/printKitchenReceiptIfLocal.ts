import { Order } from './types';

declare global {
  interface Window {
    electronAPI?: {
      // Legacy single printer API
      printReceipt: (order: any, type: string) => Promise<void>;
      updatePrinterSettings: (port: string, baudRate: number) => Promise<void>;
      testPrinterConnection: (port: string, baudRate: number, printTest?: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
      // New dual printer API
      printReceiptDual: (order: any, type: string, showPreview?: boolean) => Promise<{ success: boolean; mode: string; }>;
      getDualPrinterStatus: () => Promise<{ isDualMode: boolean; error?: string; }>;
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
        console.log(`🍳 Kitchen print mode: ${isDualMode ? 'Dual (Kitchen Printer)' : 'Single'}`);
      } catch (err) {
        console.warn('Could not get dual printer status for kitchen print');
      }
    }

    // Use appropriate API based on mode
    if (isDualMode && typeof window.electronAPI.printReceiptDual === 'function') {
      console.log('🍳 Using dual printer API for kitchen-only print');
      
      // Create a kitchen-only order that only prints kitchen receipt
      const kitchenOrder = {
        ...order,
        _kitchenOnly: true
      };
      
      const result = await window.electronAPI.printReceiptDual(kitchenOrder, type, false);
      
      if (result.success) {
        console.log(`✅ Kitchen print completed in ${result.mode} mode`);
        return true;
      } else {
        console.warn('Dual kitchen printer failed, falling back to single printer');
        // Fall through to legacy API
      }
    }

    // Fallback to legacy single printer API
    if (typeof window.electronAPI.printReceipt === 'function') {
      console.log('🍳 Using legacy single printer API for kitchen print');
      
      // Create a modified order object that indicates kitchen-only printing
      const kitchenOrder = {
        ...order,
        _kitchenOnly: true
      };
      
      await window.electronAPI.printReceipt(kitchenOrder, type);
      return true;
    } else {
      console.error('No printer API available for kitchen print');
      return false;
    }
    
  } catch (err) {
    console.error('Failed to print kitchen receipt:', err);
    return false;
  }
}
