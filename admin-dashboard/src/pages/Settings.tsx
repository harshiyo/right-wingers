import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { smsService } from '../services/smsService';
import { stores } from '../services/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSelectedStore } from '../context/SelectedStoreContext';
import { Percent, Save, RefreshCw, MessageSquare, Key, Phone, Eye, EyeOff, Settings as SettingsIcon } from 'lucide-react';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  isEnabled: boolean;
}

export default function Settings() {
  const [taxRate, setTaxRate] = useState('13');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Order Number Configuration
  const [orderNumberPrefixes, setOrderNumberPrefixes] = useState<{[key: string]: string}>({});
  const [isSavingOrderNumbers, setIsSavingOrderNumbers] = useState(false);
  const [orderNumberSaveStatus, setOrderNumberSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Twilio SMS Configuration
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    isEnabled: false
  });
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [isSavingSMS, setIsSavingSMS] = useState(false);
  const [smsSaveStatus, setSmsSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load current tax rate, SMS config, and order number prefixes from stores
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storesSnapshot = await getDocs(collection(db, 'stores'));
        if (!storesSnapshot.empty) {
          const firstStore = storesSnapshot.docs[0].data();
          if (firstStore.taxRate) {
            setTaxRate(firstStore.taxRate.toString());
          }
          if (firstStore.twilioConfig) {
            setTwilioConfig(firstStore.twilioConfig);
          }
          
          // Load order number prefixes from all stores
          const prefixes: {[key: string]: string} = {};
          storesSnapshot.docs.forEach((storeDoc) => {
            const storeData = storeDoc.data();
            if (storeData.orderNumberPrefix) {
              prefixes[storeDoc.id] = storeData.orderNumberPrefix;
            }
          });
          setOrderNumberPrefixes(prefixes);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const parsedTaxRate = parseFloat(taxRate);
      if (isNaN(parsedTaxRate) || parsedTaxRate < 0 || parsedTaxRate > 100) {
        throw new Error('Invalid tax rate');
      }

      // Get all stores
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      
      // Use batch write to update all stores
      const batch = writeBatch(db);
      
      storesSnapshot.docs.forEach((storeDoc) => {
        batch.update(doc(db, 'stores', storeDoc.id), {
          taxRate: parsedTaxRate,
          updatedAt: new Date().toISOString()
        });
      });

      // Commit the batch
      await batch.commit();

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving tax rate:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOrderNumbers = async () => {
    setIsSavingOrderNumbers(true);
    setOrderNumberSaveStatus('idle');

    try {
      // Validate order number prefixes
      const invalidPrefixes = Object.entries(orderNumberPrefixes).filter(([_, prefix]) => {
        return prefix && (prefix.length !== 3 || !/^[A-Z]{3}$/.test(prefix));
      });

      if (invalidPrefixes.length > 0) {
        throw new Error('Order number prefixes must be exactly 3 uppercase letters');
      }

      // Get all stores
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      
      // Use batch write to update stores with custom prefixes
      const batch = writeBatch(db);
      
      storesSnapshot.docs.forEach((storeDoc) => {
        const storeId = storeDoc.id;
        const prefix = orderNumberPrefixes[storeId];
        
        if (prefix) {
          batch.update(doc(db, 'stores', storeId), {
            orderNumberPrefix: prefix,
            updatedAt: new Date().toISOString()
          });
        }
      });

      // Commit the batch
      await batch.commit();

      setOrderNumberSaveStatus('success');
      setTimeout(() => setOrderNumberSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving order number prefixes:', error);
      setOrderNumberSaveStatus('error');
      setTimeout(() => setOrderNumberSaveStatus('idle'), 3000);
    } finally {
      setIsSavingOrderNumbers(false);
    }
  };

  const handleSaveSMS = async () => {
    setIsSavingSMS(true);
    setSmsSaveStatus('idle');

    try {
      // Validate Twilio configuration
      if (twilioConfig.isEnabled) {
        if (!twilioConfig.accountSid.trim()) {
          throw new Error('Account SID is required when SMS is enabled');
        }
        if (!twilioConfig.authToken.trim()) {
          throw new Error('Auth Token is required when SMS is enabled');
        }
        if (!twilioConfig.phoneNumber.trim()) {
          throw new Error('Phone Number is required when SMS is enabled');
        }
      }

      // Get all stores
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      
      // Use batch write to update all stores
      const batch = writeBatch(db);
      
      storesSnapshot.docs.forEach((storeDoc) => {
        batch.update(doc(db, 'stores', storeDoc.id), {
          twilioConfig: twilioConfig,
          updatedAt: new Date().toISOString()
        });
      });

      // Commit the batch
      await batch.commit();

      setSmsSaveStatus('success');
      setTimeout(() => setSmsSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving SMS config:', error);
      setSmsSaveStatus('error');
      setTimeout(() => setSmsSaveStatus('idle'), 3000);
    } finally {
      setIsSavingSMS(false);
    }
  };

  const testSMSService = async () => {
    try {
      // Test the SMS service with current configuration
      const result = await smsService.testSMSService();
      
      if (result.success) {
        alert('SMS service test successful! Your Twilio configuration is working correctly.');
      } else {
        alert(`SMS service test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error testing SMS service:', error);
      alert('Error testing SMS service. Please check your configuration.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">System Settings</h1>
              <p className="text-gray-600">Configure global system settings and configurations</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-[#800000] to-red-700 rounded-lg">
                <SettingsIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Settings Grid - 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Tax Settings Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#800000] to-red-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                <div>
                  <h2 className="text-lg font-semibold">Tax Settings</h2>
                  <p className="text-red-100 text-xs">Global tax rate configuration</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Global Tax Rate (%)
                </label>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                  className="text-base"
                  placeholder="Enter tax rate"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This rate will be applied to all stores
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full text-white ${
                  saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-[#800000] hover:bg-red-800'
                }`}
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : saveStatus === 'success' ? (
                  'Saved!'
                ) : saveStatus === 'error' ? (
                  'Error!'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Tax Rate
                  </>
                )}
              </Button>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-1 text-xs">How tax calculation works:</h3>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600 text-xs">
                  <li>Tax is calculated as a percentage of the subtotal</li>
                  <li>For example, if tax rate is 13% and subtotal is $100, tax will be $13</li>
                  <li>Tax is applied after any discounts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Order Number Configuration Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#800000] to-red-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔢</span>
                <div>
                  <h2 className="text-lg font-semibold">Order Numbers</h2>
                  <p className="text-red-100 text-xs">Custom order number prefixes</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-600">
                Configure custom order number prefixes for each store. Leave empty to use default prefixes.
              </p>
              
              <div className="space-y-2">
                {stores.map((store) => (
                  <div key={store.id} className="border rounded-lg p-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {store.name}
                    </label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="text"
                        value={orderNumberPrefixes[store.id] || ''}
                        onChange={(e) => setOrderNumberPrefixes(prev => ({
                          ...prev,
                          [store.id]: e.target.value.toUpperCase()
                        }))}
                        placeholder="HAM"
                        maxLength={3}
                        className="flex-1 text-sm"
                      />
                      <span className="text-xs text-gray-500">
                        {orderNumberPrefixes[store.id] ? 
                          `${orderNumberPrefixes[store.id]}P0001` : 
                          'Default'
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSaveOrderNumbers}
                disabled={isSavingOrderNumbers}
                className={`w-full text-white ${
                  orderNumberSaveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  orderNumberSaveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-[#800000] hover:bg-red-800'
                }`}
              >
                {isSavingOrderNumbers ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : orderNumberSaveStatus === 'success' ? (
                  'Saved!'
                ) : orderNumberSaveStatus === 'error' ? (
                  'Error!'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Order Numbers
                  </>
                )}
              </Button>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-1 text-xs">Order Number Format:</h3>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600 text-xs">
                  <li><strong>Format:</strong> PREFIX + P/O + 4 digits</li>
                  <li><strong>P:</strong> POS orders, <strong>O:</strong> Online orders</li>
                  <li><strong>Example:</strong> HAMP0001, HAMO0001</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SMS Configuration Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#800000] to-red-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <div>
                  <h2 className="text-lg font-semibold">SMS Marketing</h2>
                  <p className="text-red-100 text-xs">Twilio SMS configuration</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {/* Enable/Disable SMS */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twilioConfig.isEnabled}
                    onChange={(e) => setTwilioConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="h-4 w-4 text-[#800000] focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable SMS Marketing</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  When enabled, the Marketing module can send real SMS messages
                </p>
              </div>

              {twilioConfig.isEnabled && (
                <div className="space-y-3">
                  {/* Twilio Account SID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Twilio Account SID
                    </label>
                    <Input
                      type="text"
                      value={twilioConfig.accountSid}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, accountSid: e.target.value }))}
                      placeholder="AC1234567890abcdef..."
                      className="text-sm"
                    />
                  </div>

                  {/* Twilio Auth Token */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Twilio Auth Token
                    </label>
                    <div className="relative">
                      <Input
                        type={showAuthToken ? "text" : "password"}
                        value={twilioConfig.authToken}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, authToken: e.target.value }))}
                        placeholder="Enter your Twilio Auth Token"
                        className="text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthToken(!showAuthToken)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Twilio Phone Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Twilio Phone Number
                    </label>
                    <Input
                      type="text"
                      value={twilioConfig.phoneNumber}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+1234567890"
                      className="text-sm"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      onClick={handleSaveSMS}
                      disabled={isSavingSMS}
                      className={`w-full text-white ${
                        smsSaveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
                        smsSaveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-[#800000] hover:bg-red-800'
                      }`}
                    >
                      {isSavingSMS ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : smsSaveStatus === 'success' ? (
                        'Saved!'
                      ) : smsSaveStatus === 'error' ? (
                        'Error!'
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save SMS Config
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={testSMSService}
                      variant="outline"
                      className="w-full border-[#800000] text-[#800000] hover:bg-red-50"
                    >
                      Test SMS Service
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-1 text-xs">SMS Setup Guide:</h3>
                <ol className="list-decimal list-inside space-y-0.5 text-gray-600 text-xs">
                  <li>Sign up for a free Twilio account</li>
                  <li>Get your Account SID and Auth Token</li>
                  <li>Purchase a phone number from Twilio</li>
                  <li>Enter credentials above and enable SMS</li>
                  <li>Test the service to ensure it works</li>
                </ol>
                <div className="mt-2 p-2 bg-gray-100 rounded border border-gray-200">
                  <p className="text-gray-700 text-xs">
                    <strong>Free Tier:</strong> 1,000 free SMS messages per month for new accounts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 