import { useEffect, useState } from 'react';
import { X, Settings, Key, Save, AlertCircle, CheckCircle, Printer, TestTube, FileText, Monitor, ChefHat, ToggleLeft, ToggleRight, Shield } from 'lucide-react';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { useStore } from '../../context/StoreContext';
import { getDualPrinterSettings, updateDualPrinterSettings } from '../../services/storeSettings';

// Additional electronAPI methods for printer functionality
interface ElectronAPIMethods {
  updatePrinterSettings?: (port: string, baudRate: number) => Promise<void>;
  testPrinterConnection?: (port: string, baudRate: number, printTest?: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
  updateDualPrinterSettings?: (config: any) => Promise<void>;
  testDualPrinters?: (printTest?: boolean) => Promise<{ success: boolean; results: any }>;
  scanPrinters?: () => Promise<{ success: boolean; printers: any[] }>;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type TabType = 'api' | 'printer' | 'dual-printer';

// Theme configuration using brand colors - all based on #800000 maroon palette
const themes = {
  api: {
    primary: 'red',
    bg: 'from-red-50 to-red-100',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-700',
    button: 'bg-red-700 hover:bg-red-800',
    focus: 'focus:ring-red-500',
    tab: 'text-red-700 border-red-600'
  },
  'dual-printer': {
    primary: 'red',
    bg: 'from-red-50 to-red-100',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-700',
    button: 'bg-red-700 hover:bg-red-800',
    focus: 'focus:ring-red-500',
    tab: 'text-red-700 border-red-600'
  },
  printer: {
    primary: 'red',
    bg: 'from-red-50 to-red-100',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-700',
    button: 'bg-red-700 hover:bg-red-800',
    focus: 'focus:ring-red-500',
    tab: 'text-red-700 border-red-600'
  }
};

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
        const electronAPI = window.electronAPI as typeof window.electronAPI & ElectronAPIMethods;
        if (electronAPI?.updatePrinterSettings) {
          electronAPI.updatePrinterSettings(printerPort.trim(), printerBaudRate);
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
      const electronAPI = window.electronAPI as typeof window.electronAPI & ElectronAPIMethods;
      if (electronAPI?.testPrinterConnection) {
        const result = await electronAPI.testPrinterConnection(printerPort.trim(), printerBaudRate, printTest);
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
      const electronAPI = window.electronAPI as typeof window.electronAPI & ElectronAPIMethods;
      if (electronAPI?.updateDualPrinterSettings) {
        electronAPI.updateDualPrinterSettings({
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
      const electronAPI = window.electronAPI as typeof window.electronAPI & ElectronAPIMethods;
      if (electronAPI?.testDualPrinters) {
        const result = await electronAPI.testDualPrinters(printTest);
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
      const electronAPI = window.electronAPI as typeof window.electronAPI & ElectronAPIMethods;
      if (electronAPI?.scanPrinters) {
        const result = await electronAPI.scanPrinters();
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

  const currentTheme = themes[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" tabIndex={-1}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full h-[90vh] max-w-6xl rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${currentTheme.border} bg-gradient-to-r ${currentTheme.bg}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${currentTheme.icon} rounded-xl flex items-center justify-center shadow-sm`}>
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-600">Configure your POS system preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Current Store Info */}
            <div className="text-right">
              <p className="text-xs text-gray-500">Current Store</p>
              <p className="text-sm font-medium text-gray-700">{currentStore?.name || 'No store selected'}</p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-${currentTheme.primary}-100 transition-colors`}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-3 px-8 py-4 text-sm font-medium transition-all relative flex-1 justify-center ${
              activeTab === 'api'
                ? `${themes.api.tab} bg-white border-b-2 shadow-sm`
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTab === 'api' ? themes.api.icon : 'bg-gray-200 text-gray-500'
            }`}>
              <Key className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold">API Settings</div>
              <div className="text-xs opacity-75">External services</div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('dual-printer')}
            className={`flex items-center gap-3 px-8 py-4 text-sm font-medium transition-all relative flex-1 justify-center ${
              activeTab === 'dual-printer'
                ? `${themes['dual-printer'].tab} bg-white border-b-2 shadow-sm`
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTab === 'dual-printer' ? themes['dual-printer'].icon : 'bg-gray-200 text-gray-500'
            }`}>
              <Printer className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Dual Printers</div>
              <div className="text-xs opacity-75">Advanced printing</div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('printer')}
            className={`flex items-center gap-3 px-8 py-4 text-sm font-medium transition-all relative flex-1 justify-center ${
              activeTab === 'printer'
                ? `${themes.printer.tab} bg-white border-b-2 shadow-sm`
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTab === 'printer' ? themes.printer.icon : 'bg-gray-200 text-gray-500'
            }`}>
              <Monitor className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Legacy Printer</div>
              <div className="text-xs opacity-75">Single printer setup</div>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Save Message */}
          {saveMessage && (
            <div className={`mx-6 mt-6 p-4 rounded-xl flex items-center gap-3 shadow-sm ${
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

          {/* Scrollable Content Container */}
          <div className="h-full overflow-y-auto p-6 pt-4">

          {/* Tab Content */}
          {activeTab === 'api' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* API Configuration Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 ${themes.api.icon} rounded-lg flex items-center justify-center`}>
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Geoapify API</h3>
                    <p className="text-sm text-gray-600">Address autocomplete service</p>
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
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${themes.api.focus} focus:border-transparent transition-all`}
                      disabled={isLoading || isSaving}
                    />
                  </div>
                  
                  {isApiKeyChanged && (
                    <button
                      onClick={handleSaveApiKey}
                      disabled={isSaving || !geoapifyApiKey.trim()}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white ${themes.api.button} disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors`}
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save API Key'}
                    </button>
                  )}
                </div>
              </div>

              {/* API Information & Status Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">API Status</h3>
                    <p className="text-sm text-gray-600">Configuration status & information</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* API Key Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">API Key Configured</p>
                      <p className="text-xs text-gray-500">Required for address autocomplete</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      geoapifyApiKey.trim() ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>

                  {/* Help Information */}
                  <div className={`${themes.api.bg} border ${themes.api.border} rounded-lg p-4`}>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <div className="text-sm text-red-800">
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
                </div>
              </div>
            </div>
          )}

          {/* Dual Printer Configuration Tab */}
          {activeTab === 'dual-printer' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
              {/* Left Column - Configuration */}
              <div className="lg:col-span-3 space-y-4">
                {/* Dual Mode Toggle */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${themes['dual-printer'].icon} rounded-lg flex items-center justify-center`}>
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Dual Printer Mode</h3>
                        <p className="text-sm text-gray-600">Separate printers for different purposes</p>
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
                          Dual printer mode is enabled
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Printer Configuration Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Printer Configuration */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Front Printer</h3>
                        <p className="text-xs text-gray-600">Customer receipts</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Port</label>
                        <input
                          type="text"
                          value={frontPrinter.port}
                          onChange={(e) => updateFrontPrinter('port', e.target.value.toUpperCase())}
                          placeholder="COM6"
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg ${themes['dual-printer'].focus} focus:border-transparent transition-all`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Baud Rate</label>
                        <select
                          value={frontPrinter.baudRate}
                          onChange={(e) => updateFrontPrinter('baudRate', Number(e.target.value))}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg ${themes['dual-printer'].focus} focus:border-transparent transition-all`}
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
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <ChefHat className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Kitchen Printer</h3>
                        <p className="text-xs text-gray-600">Order tickets</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Port</label>
                        <input
                          type="text"
                          value={kitchenPrinter.port}
                          onChange={(e) => updateKitchenPrinter('port', e.target.value.toUpperCase())}
                          placeholder="COM7"
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg ${themes['dual-printer'].focus} focus:border-transparent transition-all`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Baud Rate</label>
                        <select
                          value={kitchenPrinter.baudRate}
                          onChange={(e) => updateKitchenPrinter('baudRate', Number(e.target.value))}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg ${themes['dual-printer'].focus} focus:border-transparent transition-all`}
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
                </div>

                {/* Action Buttons */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleTestDualPrinters(false)}
                      disabled={isTestingConnection}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <TestTube className="w-4 h-4" />
                      {isTestingConnection ? 'Testing...' : 'Test Connections'}
                    </button>

                    <button
                      onClick={() => handleTestDualPrinters(true)}
                      disabled={isTestingConnection}
                      className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white ${themes['dual-printer'].button} disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors`}
                    >
                      <FileText className="w-4 h-4" />
                      {isTestingConnection ? 'Testing...' : 'Test Print Both'}
                    </button>

                    <button
                      onClick={handleSaveDualPrinterSettings}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column - Status & Tools */}
              <div className="space-y-4">
                {/* Printer Detection */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                      <TestTube className="w-3 h-3 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Scanner</h3>
                  </div>
                  
                  <button
                    onClick={handleScanPrinters}
                    disabled={isScanning}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white ${themes['dual-printer'].button} disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors mb-3`}
                  >
                    <TestTube className="w-3 h-3" />
                    {isScanning ? 'Scanning...' : 'Scan for Printers'}
                  </button>
                  
                  {detectedPrinters.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      <p className="text-xs text-gray-600 mb-2">Detected printers:</p>
                      {detectedPrinters.map((printer, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium">{printer.path}</p>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{printer.manufacturer}</p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateFrontPrinter('port', printer.path)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded"
                            >
                              Front
                            </button>
                            <button
                              onClick={() => updateKitchenPrinter('port', printer.path)}
                              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded"
                            >
                              Kitchen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


                {/* Printer Behavior Settings */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-3 h-3 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Behavior</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-medium text-gray-700">Auto Cut</label>
                        <p className="text-xs text-gray-500">Cut after print</p>
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
                        <label className="text-xs font-medium text-gray-700">Customer</label>
                        <p className="text-xs text-gray-500">Front printer</p>
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
                        <label className="text-xs font-medium text-gray-700">Kitchen</label>
                        <p className="text-xs text-gray-500">Kitchen printer</p>
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Delay (ms)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        step="100"
                        value={printerSettings.printDelay}
                        onChange={(e) => updatePrinterSettings('printDelay', Number(e.target.value))}
                        className={`w-full px-2 py-1 text-xs border border-gray-300 rounded-lg ${themes['dual-printer'].focus} focus:border-transparent transition-all`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Printer Configuration Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 ${themes.printer.icon} rounded-lg flex items-center justify-center`}>
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Legacy Printer</h3>
                    <p className="text-sm text-gray-600">Single printer for all receipts</p>
                  </div>
                </div>
                
                <div className="space-y-4">
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
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${themes.printer.focus} focus:border-transparent transition-all`}
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
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${themes.printer.focus} focus:border-transparent transition-all`}
                      disabled={isLoading || isSaving}
                    >
                      <option value={9600}>9600 bps</option>
                      <option value={19200}>19200 bps</option>
                      <option value={38400}>38400 bps</option>
                      <option value={57600}>57600 bps</option>
                      <option value={115200}>115200 bps</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">Communication speed (38400 recommended)</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
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
                      className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white ${themes.printer.button} disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors`}
                    >
                      <FileText className="w-4 h-4" />
                      {isTestingConnection ? 'Testing...' : 'Test Print'}
                    </button>
                  </div>

                  {/* Save Button */}
                  {isPrinterSettingsChanged ? (
                    <button
                      onClick={handleSavePrinterSettings}
                      disabled={isSaving || !printerPort.trim()}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white ${themes.printer.button} disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors`}
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center px-4 py-3 text-sm text-gray-500 bg-gray-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Settings Saved
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Information Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Printer Status</h3>
                    <p className="text-sm text-gray-600">Configuration & connection status</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Port Configured</p>
                      <p className="text-xs text-gray-500">{printerPort || 'Not set'}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      printerPort.trim() ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Baud Rate</p>
                      <p className="text-xs text-gray-500">{printerBaudRate} bps</p>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                  </div>

                  {/* Settings Changed Indicator */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Settings Status</p>
                      <p className="text-xs text-gray-500">
                        {isPrinterSettingsChanged ? 'Changes pending' : 'Saved'}
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      isPrinterSettingsChanged ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                  </div>

                  {/* Information */}
                  <div className={`${themes.printer.bg} border ${themes.printer.border} rounded-lg p-4`}>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <div className="text-sm text-red-800">
                        <p className="font-medium mb-1">Legacy Mode:</p>
                        <p>This mode uses a single printer for both customer receipts and kitchen orders. For separate printers, use Dual Printer mode.</p>
                      </div>
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
        </div>

        {/* Footer */}
        <div className={`flex justify-end items-center gap-3 p-6 border-t ${currentTheme.border} bg-gradient-to-r ${currentTheme.bg}`}>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
