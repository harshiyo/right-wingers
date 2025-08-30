import { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { getStoreSettings, saveStoreSettings, StoreSettings } from '../services/storeSettings';

export const useStoreSettings = () => {
  const { currentStore } = useStore();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings when store changes
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentStore?.id) {
        setSettings(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const storeSettings = await getStoreSettings(currentStore.id);
        setSettings(storeSettings);
      } catch (err) {
        console.error('Error loading store settings:', err);
        setError('Failed to load store settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [currentStore?.id]);

  // Update settings
  const updateSettings = async (newSettings: Partial<StoreSettings>): Promise<boolean> => {
    if (!currentStore?.id) {
      setError('No store selected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await saveStoreSettings(currentStore.id, newSettings);
      
      if (success) {
        // Reload settings to get the updated values
        const updatedSettings = await getStoreSettings(currentStore.id);
        setSettings(updatedSettings);
        return true;
      } else {
        setError('Failed to save settings');
        return false;
      }
    } catch (err) {
      console.error('Error updating store settings:', err);
      setError('Failed to update settings');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get specific setting value
  const getSetting = <K extends keyof StoreSettings>(key: K): StoreSettings[K] | undefined => {
    return settings?.[key];
  };

  // Get Geoapify API key specifically
  const getGeoapifyApiKey = (): string | undefined => {
    return settings?.geoapifyApiKey;
  };

  // Get printer settings specifically
  const getPrinterSettings = (): { port: string; baudRate: number } => {
    return {
      port: settings?.printerPort || 'COM6',
      baudRate: settings?.printerBaudRate || 38400
    };
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    getSetting,
    getGeoapifyApiKey,
    getPrinterSettings,
  };
};
