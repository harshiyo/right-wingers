import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface StoreSettings {
  id: string;
  storeId: string;
  geoapifyApiKey?: string;
  // Legacy single printer settings (kept for backward compatibility)
  printerPort?: string;
  printerBaudRate?: number;
  // Dual printer settings
  frontPrinter?: {
    port: string;
    baudRate: number;
    type: 'thermal' | 'impact';
    name?: string;
  };
  kitchenPrinter?: {
    port: string;
    baudRate: number;
    type: 'thermal' | 'impact';
    name?: string;
  };
  // Printer behavior settings
  printerSettings?: {
    enableDualPrinting: boolean;
    customerReceiptEnabled: boolean;
    kitchenReceiptEnabled: boolean;
    autoCutEnabled: boolean;
    printDelay?: number; // ms delay between prints
  };
  // Add more settings as needed in the future
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get store settings from Firestore
 */
export const getStoreSettings = async (storeId: string): Promise<StoreSettings | null> => {
  try {
    const settingsDocRef = doc(db, 'storeSettings', storeId);
    const settingsDoc = await getDoc(settingsDocRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return {
        id: settingsDoc.id,
        storeId,
        geoapifyApiKey: data.geoapifyApiKey || '',
        // Legacy single printer settings
        printerPort: data.printerPort || 'COM6',
        printerBaudRate: data.printerBaudRate || 38400,
        // Dual printer settings - include all fields from Firebase
        frontPrinter: data.frontPrinter,
        kitchenPrinter: data.kitchenPrinter,
        printerSettings: data.printerSettings,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || undefined,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return null;
  }
};

/**
 * Save store settings to Firestore
 */
export const saveStoreSettings = async (storeId: string, settings: Partial<StoreSettings>): Promise<boolean> => {
  try {
    const settingsDocRef = doc(db, 'storeSettings', storeId);
    const existingDoc = await getDoc(settingsDocRef);
    
    const now = new Date();
    
    if (existingDoc.exists()) {
      // Update existing settings
      await updateDoc(settingsDocRef, {
        ...settings,
        updatedAt: now,
      });
    } else {
      // Create new settings document
      await setDoc(settingsDocRef, {
        storeId,
        ...settings,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving store settings:', error);
    return false;
  }
};

/**
 * Update specific setting for a store
 */
export const updateStoreSetting = async (
  storeId: string, 
  settingKey: keyof StoreSettings, 
  value: any
): Promise<boolean> => {
  try {
    const settingsDocRef = doc(db, 'storeSettings', storeId);
    await updateDoc(settingsDocRef, {
      [settingKey]: value,
      updatedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error(`Error updating setting ${settingKey}:`, error);
    return false;
  }
};

/**
 * Get Geoapify API key for a specific store
 */
export const getGeoapifyApiKey = async (storeId: string): Promise<string | null> => {
  try {
    const settings = await getStoreSettings(storeId);
    return settings?.geoapifyApiKey || null;
  } catch (error) {
    console.error('Error fetching Geoapify API key:', error);
    return null;
  }
};

/**
 * Get printer settings for a specific store (legacy single printer)
 */
export const getPrinterSettings = async (storeId: string): Promise<{ port: string; baudRate: number } | null> => {
  try {
    const settings = await getStoreSettings(storeId);
    return {
      port: settings?.printerPort || 'COM6',
      baudRate: settings?.printerBaudRate || 38400
    };
  } catch (error) {
    console.error('Error fetching printer settings:', error);
    return null;
  }
};

/**
 * Get dual printer configuration for a specific store
 */
export const getDualPrinterSettings = async (storeId: string) => {
  try {
    const settings = await getStoreSettings(storeId);
    
    if (!settings) {
      return {
        isDualMode: false,
        frontPrinter: { port: 'COM6', baudRate: 38400, type: 'thermal' as const },
        kitchenPrinter: { port: 'COM7', baudRate: 38400, type: 'impact' as const },
        printerSettings: {
          enableDualPrinting: false,
          customerReceiptEnabled: true,
          kitchenReceiptEnabled: true,
          autoCutEnabled: true,
          printDelay: 500
        }
      };
    }
    
    return {
      isDualMode: settings.printerSettings?.enableDualPrinting || false,
      frontPrinter: settings.frontPrinter || { 
        port: settings.printerPort || 'COM6', 
        baudRate: settings.printerBaudRate || 38400, 
        type: 'thermal' as const 
      },
      kitchenPrinter: settings.kitchenPrinter || { 
        port: 'COM7', 
        baudRate: 38400, 
        type: 'impact' as const 
      },
      printerSettings: {
        enableDualPrinting: settings.printerSettings?.enableDualPrinting || false,
        customerReceiptEnabled: settings.printerSettings?.customerReceiptEnabled ?? true,
        kitchenReceiptEnabled: settings.printerSettings?.kitchenReceiptEnabled ?? true,
        autoCutEnabled: settings.printerSettings?.autoCutEnabled ?? true,
        printDelay: settings.printerSettings?.printDelay || 500
      }
    };
  } catch (error) {
    console.error('Error fetching dual printer settings:', error);
    return null;
  }
};

/**
 * Update dual printer settings
 */
export const updateDualPrinterSettings = async (
  storeId: string, 
  printerConfig: {
    frontPrinter?: { port: string; baudRate: number; type: 'thermal' | 'impact'; name?: string };
    kitchenPrinter?: { port: string; baudRate: number; type: 'thermal' | 'impact'; name?: string };
    printerSettings?: {
      enableDualPrinting?: boolean;
      customerReceiptEnabled?: boolean;
      kitchenReceiptEnabled?: boolean;
      autoCutEnabled?: boolean;
      printDelay?: number;
    };
  }
) => {
  try {
    const docRef = doc(db, 'storeSettings', storeId);
    const updateData: Partial<StoreSettings> = {
      updatedAt: new Date().toISOString()
    };

    if (printerConfig.frontPrinter) {
      updateData.frontPrinter = printerConfig.frontPrinter;
    }
    
    if (printerConfig.kitchenPrinter) {
      updateData.kitchenPrinter = printerConfig.kitchenPrinter;
    }
    
    if (printerConfig.printerSettings) {
      // Get current settings first to merge
      const currentSettings = await getStoreSettings(storeId);
      updateData.printerSettings = {
        ...currentSettings?.printerSettings,
        ...printerConfig.printerSettings
      };
    }

    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating dual printer settings:', error);
    throw error;
  }
};
