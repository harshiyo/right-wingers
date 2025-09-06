import { useEffect, useState } from 'react';
import { X, Settings, Key, Save, AlertCircle, CheckCircle, Printer, TestTube, FileText, Link, Monitor, ChefHat, ToggleLeft, ToggleRight } from 'lucide-react';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { useStore } from '../../context/StoreContext';
import { getDualPrinterSettings, updateDualPrinterSettings } from '../../services/storeSettings';

declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (order: any, type: string) => Promise<void>;
      updatePrinterSettings: (port: string, baudRate: number) => Promise<void>;
      testPrinterConnection: (port: string, baudRate: number, printTest?: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
      // Dual printer APIs
      updateDualPrinterSettings: (config: any) => Promise<void>;
      testDualPrinters: (printTest?: boolean) => Promise<{ success: boolean; results: any }>;
      scanPrinters: () => Promise<{ success: boolean; printers: any[] }>;
    };
  }
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type TabType = 'api' | 'printer' | 'dual-printer';

interface PrinterConfig {
  port: string;
  baudRate: number;
  type: 'thermal' | 'impact';
  name?: string;
}

interface PrinterSettings {
  enableDualPrinting: boolean;
  customerReceiptEnabled: boolean;
  kitchenReceiptEnabled: boolean;
  autoCutEnabled: boolean;
  printDelay: number;
}

export const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const { currentStore } = useStore();
  const { settings, isLoading, error, updateSettings } = useStoreSettings();
  
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [geoapifyApiKey, setGeoapifyApiKey] = useState('');
  const [printerPort, setPrinterPort] = useState('COM6');
  const [printerBaudRate, setPrinterBaudRate] = useState(38400);
  
  // Dual printer states
  const [isDualMode, setIsDualMode] = useState(false);
  const [frontPrinter, setFrontPrinter] = useState<PrinterConfig>({
    port: 'COM6',
    baudRate: 38400,
    type: 'thermal',
    name: 'Front Receipt Printer'
  });
  const [kitchenPrinter, setKitchenPrinter] = useState<PrinterConfig>({
    port: 'COM7',
    baudRate: 38400,
    type: 'impact',
    name: 'Kitchen Order Printer'
  });
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    enableDualPrinting: false,
    customerReceiptEnabled: true,
    kitchenReceiptEnabled: true,
    autoCutEnabled: true,
    printDelay: 500
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detectedPrinters, setDetectedPrinters] = useState<any[]>([]);

  // Load current settings when dialog opens or settings change
  useEffect(() => {
    if (open && currentStore?.id) {
      loadDualPrinterSettings();
      if (settings) {
        setGeoapifyApiKey(settings.geoapifyApiKey || '');
        setPrinterPort(settings.printerPort || 'COM6');
        setPrinterBaudRate(settings.printerBaudRate || 38400);
      }
    }
  }, [open, settings, currentStore?.id]);

  const loadDualPrinterSettings = async () => {
    if (!currentStore?.id) return;
    
    try {
      const config = await getDualPrinterSettings(currentStore.id);
      if (config) {
        setIsDualMode(config.isDualMode);
        setFrontPrinter(config.frontPrinter);
        setKitchenPrinter(config.kitchenPrinter);
        setPrinterSettings(config.printerSettings);
      }
    } catch (error) {
      console.error('Error loading dual printer settings:', error);
    }
  };

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

  // Dual printer handlers
  const handleSaveDualPrinterSettings = async () => {
    if (!currentStore?.id) {
      setSaveMessage({ type: 'error', text: 'No store selected' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateDualPrinterSettings(currentStore.id, {
        frontPrinter,
        kitchenPrinter,
        printerSettings: {
          ...printerSettings,
          enableDualPrinting: isDualMode
        }
      });

      // Notify electron process about settings change
      if (window.electronAPI?.updateDualPrinterSettings) {
        window.electronAPI.updateDualPrinterSettings({
          frontPrinter,
          kitchenPrinter,
          printerSettings: {
            ...printerSettings,
            enableDualPrinting: isDualMode
          }
        });
      }

      setSaveMessage({ type: 'success', text: 'Dual printer settings saved successfully' });
    } catch (err) {
      console.error('Error saving dual printer settings:', err);
      setSaveMessage({ type: 'error', text: 'Failed to save dual printer settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestDualPrinters = async (printTest = false) => {
    setIsTestingConnection(true);
    setSaveMessage(null);

    try {
      if (window.electronAPI?.testDualPrinters) {
        const result = await window.electronAPI.testDualPrinters(printTest);
        if (result.success) {
          setSaveMessage({ 
            type: 'success', 
            text: printTest ? 'Test prints sent to both printers!' : 'Both printers connected successfully!' 
          });
        } else {
          setSaveMessage({ 
            type: 'error', 
            text: `Test failed - check printer connections and settings` 
          });
        }
      } else {
        setSaveMessage({ type: 'error', text: 'Dual printer testing not available in browser mode' });
      }
    } catch (err) {
      console.error('Error testing dual printers:', err);
      setSaveMessage({ type: 'error', text: 'Failed to test dual printers' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleScanPrinters = async () => {
    setIsScanning(true);
    setSaveMessage(null);

    try {
      if (window.electronAPI?.scanPrinters) {
        const result = await window.electronAPI.scanPrinters();
        if (result.success) {
          setDetectedPrinters(result.printers);
          setSaveMessage({ 
            type: 'success', 
            text: `Found ${result.printers.length} printer(s)` 
          });
        } else {
          setSaveMessage({ type: 'error', text: 'Printer scan failed' });
        }
      } else {
        setSaveMessage({ type: 'error', text: 'Printer scanning not available in browser mode' });
      }
    } catch (err) {
      console.error('Error scanning printers:', err);
      setSaveMessage({ type: 'error', text: 'Failed to scan printers' });
    } finally {
      setIsScanning(false);
    }
  };

  const updateFrontPrinter = (field: keyof PrinterConfig, value: any) => {
    setFrontPrinter(prev => ({ ...prev, [field]: value }));
  };

  const updateKitchenPrinter = (field: keyof PrinterConfig, value: any) => {
    setKitchenPrinter(prev => ({ ...prev, [field]: value }));
  };

  const updatePrinterSettings = (field: keyof PrinterSettings, value: any) => {
    setPrinterSettings(prev => ({ ...prev, [field]: value }));
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

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'api'
                ? 'text-red-600 bg-white border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Link className="w-4 h-4" />
            API Configuration
          </button>
          <button
            onClick={() => setActiveTab('dual-printer')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'dual-printer'
                ? 'text-red-600 bg-white border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            Dual Printer Setup
          </button>
          <button
            onClick={() => setActiveTab('printer')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'printer'
                ? 'text-red-600 bg-white border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Legacy Printer
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Save Message */}
          {saveMessage && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              saveMessage.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {saveMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{saveMessage.text}</span>
            </div>
          )}

          {/* Store Information Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Store</h3>
            <p className="text-blue-700 font-medium">{currentStore?.name || 'No store selected'}</p>
          </div>

          {/* Tab Content */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="grid gap-6">
                {/* API Configuration Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Key className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Geoapify API Configuration</h3>
                      <p className="text-sm text-gray-600">Required for address autocomplete functionality</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="geoapify-api-key" className="block text-sm font-medium text-gray-700 mb-3">
                        API Key
                      </label>
                      <input
                        id="geoapify-api-key"
                        type="password"
                        value={geoapifyApiKey}
                        onChange={(e) => setGeoapifyApiKey(e.target.value)}
                        placeholder="Enter your Geoapify API key"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        disabled={isLoading || isSaving}
                      />
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">i</span>
                        </div>
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">How to get your API key:</p>
                          <p>Visit{' '}
                            <a 
                              href="https://www.geoapify.com/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium underline hover:no-underline"
                            >
                              geoapify.com
                            </a>
                            {' '}and create a free account to get your API key for address autocomplete.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {isApiKeyChanged && (
                      <button
                        onClick={handleSaveApiKey}
                        disabled={isSaving || !geoapifyApiKey.trim()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save API Key'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dual Printer Configuration Tab */}
          {activeTab === 'dual-printer' && (
            <div className="space-y-6">
              {/* Dual Mode Toggle */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Printer className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Dual Printer Mode</h3>
                      <p className="text-sm text-gray-600">Enable separate printers for customer receipts and kitchen orders</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDualMode(!isDualMode)}
                    className="flex items-center gap-2"
                  >
                    {isDualMode ? (
                      <ToggleRight className="w-8 h-8 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">
                      {isDualMode ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                </div>

                {isDualMode && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        Dual printer mode is enabled. Customer receipts will print on the front printer, and kitchen orders will print on the kitchen printer.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Printer Scan */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Printer Detection</h3>
                  <button
                    onClick={handleScanPrinters}
                    disabled={isScanning}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <TestTube className="w-4 h-4" />
                    {isScanning ? 'Scanning...' : 'Scan for Printers'}
                  </button>
                </div>
                
                {detectedPrinters.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">Detected printers:</p>
                    {detectedPrinters.map((printer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{printer.path}</p>
                          <p className="text-sm text-gray-600">{printer.manufacturer} ({printer.type})</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateFrontPrinter('port', printer.path)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                          >
                            Use as Front
                          </button>
                          <button
                            onClick={() => updateKitchenPrinter('port', printer.path)}
                            className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded"
                          >
                            Use as Kitchen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Front Printer Configuration */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Front Printer (Customer Receipts)</h3>
                    <p className="text-sm text-gray-600">Thermal printer for fast, quiet customer receipts</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Serial Port</label>
                    <input
                      type="text"
                      value={frontPrinter.port}
                      onChange={(e) => updateFrontPrinter('port', e.target.value.toUpperCase())}
                      placeholder="COM6"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Baud Rate</label>
                    <select
                      value={frontPrinter.baudRate}
                      onChange={(e) => updateFrontPrinter('baudRate', Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value={9600}>9600 bps</option>
                      <option value={19200}>19200 bps</option>
                      <option value={38400}>38400 bps</option>
                      <option value={57600}>57600 bps</option>
                      <option value={115200}>115200 bps</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Kitchen Printer Configuration */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Kitchen Printer (Order Tickets)</h3>
                    <p className="text-sm text-gray-600">Impact printer for multi-copy kitchen orders (white + yellow)</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Serial Port</label>
                    <input
                      type="text"
                      value={kitchenPrinter.port}
                      onChange={(e) => updateKitchenPrinter('port', e.target.value.toUpperCase())}
                      placeholder="COM7"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Baud Rate</label>
                    <select
                      value={kitchenPrinter.baudRate}
                      onChange={(e) => updateKitchenPrinter('baudRate', Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      <option value={9600}>9600 bps</option>
                      <option value={19200}>19200 bps</option>
                      <option value={38400}>38400 bps</option>
                      <option value={57600}>57600 bps</option>
                      <option value={115200}>115200 bps</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Printer Behavior Settings */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Printer Behavior</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Auto Cut Paper</label>
                      <p className="text-xs text-gray-500">Automatically cut paper after each receipt</p>
                    </div>
                    <button
                      onClick={() => updatePrinterSettings('autoCutEnabled', !printerSettings.autoCutEnabled)}
                      className="flex items-center gap-2"
                    >
                      {printerSettings.autoCutEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Customer Receipts</label>
                      <p className="text-xs text-gray-500">Print customer receipts on front printer</p>
                    </div>
                    <button
                      onClick={() => updatePrinterSettings('customerReceiptEnabled', !printerSettings.customerReceiptEnabled)}
                      className="flex items-center gap-2"
                    >
                      {printerSettings.customerReceiptEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Kitchen Orders</label>
                      <p className="text-xs text-gray-500">Print kitchen orders on kitchen printer</p>
                    </div>
                    <button
                      onClick={() => updatePrinterSettings('kitchenReceiptEnabled', !printerSettings.kitchenReceiptEnabled)}
                      className="flex items-center gap-2"
                    >
                      {printerSettings.kitchenReceiptEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Print Delay (ms)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      step="100"
                      value={printerSettings.printDelay}
                      onChange={(e) => updatePrinterSettings('printDelay', Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-2">Delay between consecutive prints (recommended: 500ms)</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleTestDualPrinters(false)}
                    disabled={isTestingConnection}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <TestTube className="w-4 h-4" />
                    {isTestingConnection ? 'Testing...' : 'Test Connections'}
                  </button>

                  <button
                    onClick={() => handleTestDualPrinters(true)}
                    disabled={isTestingConnection}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    {isTestingConnection ? 'Testing...' : 'Test Print Both'}
                  </button>

                  <button
                    onClick={handleSaveDualPrinterSettings}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="space-y-6">
              <div className="grid gap-6">
                {/* Printer Configuration Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Printer className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Legacy Single Printer Setup</h3>
                      <p className="text-sm text-gray-600">Configure single printer for both customer and kitchen receipts</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Serial Port */}
                    <div>
                      <label htmlFor="printer-port" className="block text-sm font-medium text-gray-700 mb-3">
                        Serial Port
                      </label>
                      <input
                        id="printer-port"
                        type="text"
                        value={printerPort}
                        onChange={(e) => setPrinterPort(e.target.value.toUpperCase())}
                        placeholder="COM6"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        disabled={isLoading || isSaving}
                      />
                      <p className="text-xs text-gray-500 mt-2">Examples: COM6, COM3, /dev/ttyUSB0</p>
                    </div>

                    {/* Baud Rate */}
                    <div>
                      <label htmlFor="printer-baudrate" className="block text-sm font-medium text-gray-700 mb-3">
                        Baud Rate
                      </label>
                      <select
                        id="printer-baudrate"
                        value={printerBaudRate}
                        onChange={(e) => setPrinterBaudRate(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        disabled={isLoading || isSaving}
                      >
                        <option value={9600}>9600 bps</option>
                        <option value={19200}>19200 bps</option>
                        <option value={38400}>38400 bps</option>
                        <option value={57600}>57600 bps</option>
                        <option value={115200}>115200 bps</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">Communication speed (38400 is recommended)</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Test Connection Button */}
                      <button
                        onClick={() => handleTestConnection(false)}
                        disabled={isTestingConnection || isSaving || !printerPort.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <TestTube className="w-4 h-4" />
                        {isTestingConnection ? 'Testing...' : 'Test Connection'}
                      </button>

                      {/* Test Print Button */}
                      <button
                        onClick={() => handleTestConnection(true)}
                        disabled={isTestingConnection || isSaving || !printerPort.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        {isTestingConnection ? 'Testing...' : 'Test Print'}
                      </button>

                      {/* Save Button */}
                      {isPrinterSettingsChanged ? (
                        <button
                          onClick={handleSavePrinterSettings}
                          disabled={isSaving || !printerPort.trim()}
                          className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center px-4 py-3 text-sm text-gray-500 bg-gray-50 rounded-lg">
                          Settings Saved
                        </div>
                      )}
                    </div>
                  </div>


                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Error: {error}</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8 mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-3">Loading settings...</p>
            </div>
          )}
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
