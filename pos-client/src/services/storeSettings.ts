import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface StoreSettings {
  id: string;
  storeId: string;
  geoapifyApiKey?: string;
  // Printer settings
  printerPort?: string;
  printerBaudRate?: number;
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
        printerPort: data.printerPort || 'COM6',
        printerBaudRate: data.printerBaudRate || 38400,
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
 * Get printer settings for a specific store
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
