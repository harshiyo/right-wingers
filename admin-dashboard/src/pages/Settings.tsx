import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSelectedStore } from '../context/SelectedStoreContext';
import { Percent, Save, RefreshCw } from 'lucide-react';

export default function Settings() {
  const [taxRate, setTaxRate] = useState('13');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load current tax rate from any store (they should all be the same)
  useEffect(() => {
    const loadTaxRate = async () => {
      try {
        const storesSnapshot = await getDocs(collection(db, 'stores'));
        if (!storesSnapshot.empty) {
          const firstStore = storesSnapshot.docs[0].data();
          if (firstStore.taxRate) {
            setTaxRate(firstStore.taxRate.toString());
          }
        }
      } catch (error) {
        console.error('Error loading tax rate:', error);
      }
    };

    loadTaxRate();
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
      </div>
    </div>
  );
} 