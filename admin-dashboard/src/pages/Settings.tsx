import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { smsService } from '../services/smsService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSelectedStore } from '../context/SelectedStoreContext';
import { Percent, Save, RefreshCw, MessageSquare, Key, Phone, Eye, EyeOff } from 'lucide-react';

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

  // Load current tax rate and SMS config from any store
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Global Settings</h1>

        {/* Tax Rate Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5 text-gray-600" />
            Tax Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Global Tax Rate (%)
              </label>
              <div className="flex gap-4 items-start">
                <div className="flex-1 max-w-xs">
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="text-lg"
                    placeholder="Enter tax rate"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This rate will be applied to all stores
                  </p>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`min-w-[100px] ${
                    saveStatus === 'success' ? 'bg-green-600' :
                    saveStatus === 'error' ? 'bg-red-600' :
                    ''
                  }`}
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : saveStatus === 'success' ? (
                    'Saved!'
                  ) : saveStatus === 'error' ? (
                    'Error!'
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">How tax calculation works:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Tax is calculated as a percentage of the subtotal</li>
                <li>For example, if tax rate is 13% and subtotal is $100, tax will be $13</li>
                <li>Tax is applied after any discounts</li>
                <li>Changes to tax rate will affect all stores immediately</li>
                <li>The same tax rate is used for both online ordering and POS systems</li>
              </ul>
            </div>
          </div>
        </div>

        {/* SMS Configuration Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-600" />
            SMS Marketing Configuration
          </h2>
          
          <div className="space-y-6">
            {/* Enable/Disable SMS */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={twilioConfig.isEnabled}
                  onChange={(e) => setTwilioConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable SMS Marketing</span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                When enabled, the Marketing module can send real SMS messages to customers
              </p>
            </div>

            {twilioConfig.isEnabled && (
              <>
                {/* Twilio Account SID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Twilio Account SID
                  </label>
                  <div className="flex gap-2">
                    <Key className="h-4 w-4 text-gray-400 mt-3" />
                    <Input
                      type="text"
                      value={twilioConfig.accountSid}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, accountSid: e.target.value }))}
                      placeholder="AC1234567890abcdef1234567890abcdef"
                      className="flex-1"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Found in your Twilio Console dashboard
                  </p>
                </div>

                {/* Twilio Auth Token */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Twilio Auth Token
                  </label>
                  <div className="flex gap-2">
                    <Key className="h-4 w-4 text-gray-400 mt-3" />
                    <div className="flex-1 relative">
                      <Input
                        type={showAuthToken ? "text" : "password"}
                        value={twilioConfig.authToken}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, authToken: e.target.value }))}
                        placeholder="Enter your Twilio Auth Token"
                        className="pr-10"
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
                  <p className="mt-1 text-sm text-gray-500">
                    Found in your Twilio Console dashboard (keep this secure)
                  </p>
                </div>

                {/* Twilio Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Twilio Phone Number
                  </label>
                  <div className="flex gap-2">
                    <Phone className="h-4 w-4 text-gray-400 mt-3" />
                    <Input
                      type="text"
                      value={twilioConfig.phoneNumber}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+1234567890"
                      className="flex-1"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    The phone number you purchased from Twilio
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveSMS}
                    disabled={isSavingSMS}
                    className={`${
                      smsSaveStatus === 'success' ? 'bg-green-600' :
                      smsSaveStatus === 'error' ? 'bg-red-600' :
                      ''
                    }`}
                  >
                    {isSavingSMS ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : smsSaveStatus === 'success' ? (
                      'Saved!'
                    ) : smsSaveStatus === 'error' ? (
                      'Error!'
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save SMS Config
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={testSMSService}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Test SMS Service
                  </Button>
                </div>
              </>
            )}

            {/* SMS Configuration Info */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">SMS Marketing Setup Guide:</h3>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
                <li>Sign up for a free Twilio account at <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="underline">twilio.com</a></li>
                <li>Get your Account SID and Auth Token from the Twilio Console</li>
                <li>Purchase a phone number from Twilio (or use trial number)</li>
                <li>Enter your credentials above and enable SMS Marketing</li>
                <li>Test the service to ensure everything works correctly</li>
                <li>Start sending promotional messages to your customers!</li>
              </ol>
              <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-200">
                <p className="text-blue-800 text-sm">
                  <strong>Free Tier:</strong> Twilio offers 1,000 free SMS messages per month for new accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 