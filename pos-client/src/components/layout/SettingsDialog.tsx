import { useEffect, useState } from 'react';
import { X, Settings, Key, Save, AlertCircle, CheckCircle, Printer, TestTube, FileText } from 'lucide-react';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { useStore } from '../../context/StoreContext';

declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (order: any, type: string) => Promise<void>;
      updatePrinterSettings: (port: string, baudRate: number) => Promise<void>;
      testPrinterConnection: (port: string, baudRate: number, printTest?: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
    };
  }
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const { currentStore } = useStore();
  const { settings, isLoading, error, updateSettings } = useStoreSettings();
  
  const [geoapifyApiKey, setGeoapifyApiKey] = useState('');
  const [printerPort, setPrinterPort] = useState('COM6');
  const [printerBaudRate, setPrinterBaudRate] = useState(38400);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load current settings when dialog opens or settings change
  useEffect(() => {
    if (open && settings) {
      setGeoapifyApiKey(settings.geoapifyApiKey || '');
      setPrinterPort(settings.printerPort || 'COM6');
      setPrinterBaudRate(settings.printerBaudRate || 38400);
    }
  }, [open, settings]);

  // Clear save message after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  // ESC key to close dialog
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const handleSaveApiKey = async () => {
    if (!currentStore?.id) {
      setSaveMessage({ type: 'error', text: 'No store selected' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const success = await updateSettings({
        geoapifyApiKey: geoapifyApiKey.trim()
      });

      if (success) {
        setSaveMessage({ type: 'success', text: 'API key saved successfully' });
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save API key' });
      }
    } catch (err) {
      console.error('Error saving API key:', err);
      setSaveMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrinterSettings = async () => {
    if (!currentStore?.id) {
      setSaveMessage({ type: 'error', text: 'No store selected' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const success = await updateSettings({
        printerPort: printerPort.trim(),
        printerBaudRate: printerBaudRate
      });

      if (success) {
        // Notify electron process about printer settings change
        if (window.electronAPI?.updatePrinterSettings) {
          window.electronAPI.updatePrinterSettings(printerPort.trim(), printerBaudRate);
        }
        setSaveMessage({ type: 'success', text: 'Printer settings saved successfully' });
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save printer settings' });
      }
    } catch (err) {
      console.error('Error saving printer settings:', err);
      setSaveMessage({ type: 'error', text: 'Failed to save printer settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (printTest = false) => {
    setIsTestingConnection(true);
    setSaveMessage(null);

    try {
      if (window.electronAPI?.testPrinterConnection) {
        const result = await window.electronAPI.testPrinterConnection(printerPort.trim(), printerBaudRate, printTest);
        if (result.success) {
          setSaveMessage({ type: 'success', text: result.message || 'Printer connection test successful!' });
        } else {
          setSaveMessage({ type: 'error', text: `Connection failed: ${result.message || result.error || 'Unknown error'}` });
        }
      } else {
        setSaveMessage({ type: 'error', text: 'Printer testing not available in browser mode' });
      }
    } catch (err) {
      console.error('Error testing printer connection:', err);
      setSaveMessage({ type: 'error', text: 'Failed to test printer connection' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isApiKeyChanged = geoapifyApiKey.trim() !== (settings?.geoapifyApiKey || '');
  const isPrinterSettingsChanged = 
    printerPort.trim() !== (settings?.printerPort || 'COM6') ||
    printerBaudRate !== (settings?.printerBaudRate || 38400);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" tabIndex={-1}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white max-w-2xl w-full max-h-[90vh] rounded-2xl shadow-xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-600">Configure your POS system preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-red-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Save Message */}
          {saveMessage && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              saveMessage.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {saveMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{saveMessage.text}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Store Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Current Store</h3>
              <p className="text-sm text-gray-600">{currentStore?.name || 'No store selected'}</p>
            </div>

            {/* API Configuration Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-medium text-gray-900">API Configuration</h3>
              </div>
              
              <div className="space-y-4">
                {/* Geoapify API Key */}
                <div>
                  <label htmlFor="geoapify-api-key" className="block text-sm font-medium text-gray-700 mb-2">
                    Geoapify API Key
                    <span className="text-gray-500 font-normal ml-1">(for address autocomplete)</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      id="geoapify-api-key"
                      type="password"
                      value={geoapifyApiKey}
                      onChange={(e) => setGeoapifyApiKey(e.target.value)}
                      placeholder="Enter your Geoapify API key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={isLoading || isSaving}
                    />
                    <p className="text-xs text-gray-500">
                      Get your API key from{' '}
                      <a 
                        href="https://www.geoapify.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-700 underline"
                      >
                        geoapify.com
                      </a>
                    </p>
                    
                    {/* Save Button */}
                    {isApiKeyChanged && (
                      <button
                        onClick={handleSaveApiKey}
                        disabled={isSaving || !geoapifyApiKey.trim()}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save API Key'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Printer Configuration Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Printer className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-medium text-gray-900">Printer Configuration</h3>
              </div>
              
              <div className="space-y-4">
                {/* Printer Port */}
                <div>
                  <label htmlFor="printer-port" className="block text-sm font-medium text-gray-700 mb-2">
                    Serial Port
                    <span className="text-gray-500 font-normal ml-1">(e.g., COM6, COM3)</span>
                  </label>
                  <input
                    id="printer-port"
                    type="text"
                    value={printerPort}
                    onChange={(e) => setPrinterPort(e.target.value.toUpperCase())}
                    placeholder="COM6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isLoading || isSaving}
                  />
                </div>

                {/* Baud Rate */}
                <div>
                  <label htmlFor="printer-baudrate" className="block text-sm font-medium text-gray-700 mb-2">
                    Baud Rate
                    <span className="text-gray-500 font-normal ml-1">(communication speed)</span>
                  </label>
                  <select
                    id="printer-baudrate"
                    value={printerBaudRate}
                    onChange={(e) => setPrinterBaudRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isLoading || isSaving}
                  >
                    <option value={9600}>9600</option>
                    <option value={19200}>19200</option>
                    <option value={38400}>38400</option>
                    <option value={57600}>57600</option>
                    <option value={115200}>115200</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  {/* Test Connection Button */}
                  <button
                    onClick={() => handleTestConnection(false)}
                    disabled={isTestingConnection || isSaving || !printerPort.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <TestTube className="w-4 h-4" />
                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                  </button>

                  {/* Test Print Button */}
                  <button
                    onClick={() => handleTestConnection(true)}
                    disabled={isTestingConnection || isSaving || !printerPort.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    {isTestingConnection ? 'Testing...' : 'Test Print'}
                  </button>

                  {/* Save Button */}
                  {isPrinterSettingsChanged && (
                    <button
                      onClick={handleSavePrinterSettings}
                      disabled={isSaving || !printerPort.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Printer Settings'}
                    </button>
                  )}
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    <strong>Test Connection:</strong> Sends electronic commands to verify printer communication.
                  </p>
                  <p>
                    <strong>Test Print:</strong> Prints a small test receipt to verify printer is working physically.
                  </p>
                  <p>Changes take effect immediately after saving.</p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Error: {error}</span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading settings...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
