import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Select } from '../components/ui/Select';
import { Truck, Plus, Edit, Trash2, Save, MapPin, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DeliveryCharge {
  id: string;
  name: string;
  minDistance: number;
  maxDistance: number;
  baseCharge: number;
  perKmCharge: number;
  freeDeliveryThreshold: number;
  isActive: boolean;
  storeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DeliveryChargeForm {
  name: string;
  minDistance: number;
  maxDistance: number;
  baseCharge: number;
  perKmCharge: number;
  freeDeliveryThreshold: number;
  isActive: boolean;
  storeId?: string;
}

const DeliveryCharges: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [stores, setStores] = useState<Array<{id: string, name: string}>>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<DeliveryCharge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<DeliveryChargeForm>({
    name: '',
    minDistance: 0,
    maxDistance: 0,
    baseCharge: 0,
    perKmCharge: 0,
    freeDeliveryThreshold: 0,
    isActive: true,
    storeId: ''
  });

  // Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const storesSnapshot = await getDocs(collection(db, 'stores'));
        const storesData = storesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setStores(storesData);
      } catch (error) {
        console.error('Error fetching stores:', error);
      }
    };
    fetchStores();
  }, []);

  // Fetch delivery charges
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'deliveryCharges'), orderBy('minDistance', 'asc')),
      (snapshot) => {
        const charges = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as DeliveryCharge[];
        setDeliveryCharges(charges);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching delivery charges:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      minDistance: 0,
      maxDistance: 0,
      baseCharge: 0,
      perKmCharge: 0,
      freeDeliveryThreshold: 0,
      isActive: true,
      storeId: ''
    });
    setEditingCharge(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check authentication
    if (!currentUser) {
      alert('You must be logged in to create delivery charges');
      return;
    }
    
    // Basic validation
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    
    if (formData.minDistance < 0 || formData.maxDistance < 0) {
      alert('Distances must be positive');
      return;
    }
    
    if (formData.maxDistance <= formData.minDistance) {
      alert('Max distance must be greater than min distance');
      return;
    }
    
    try {
      const chargeData = {
        ...formData,
        updatedAt: new Date()
      };

      if (editingCharge) {
        await updateDoc(doc(db, 'deliveryCharges', editingCharge.id), chargeData);
      } else {
        const newChargeData = {
          ...chargeData,
          createdAt: new Date()
        };
        await addDoc(collection(db, 'deliveryCharges'), newChargeData);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving delivery charge:', error);
      alert('Error saving delivery charge. Please try again.');
    }
  };

  const handleEdit = (charge: DeliveryCharge) => {
    setEditingCharge(charge);
    setFormData({
      name: charge.name,
      minDistance: charge.minDistance,
      maxDistance: charge.maxDistance,
      baseCharge: charge.baseCharge,
      perKmCharge: charge.perKmCharge,
      freeDeliveryThreshold: charge.freeDeliveryThreshold,
      isActive: charge.isActive,
      storeId: charge.storeId || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this delivery charge?')) {
      try {
        await deleteDoc(doc(db, 'deliveryCharges', id));
      } catch (error) {
        console.error('Error deleting delivery charge:', error);
        alert('Error deleting delivery charge. Please try again.');
      }
    }
  };

  const calculateExampleCharge = (charge: DeliveryCharge, distance: number, scenario: 'below' | 'above' = 'below') => {
  // Check if distance is outside the valid range
  if (distance < charge.minDistance || distance > charge.maxDistance) {
    // For simplicity in examples, return null if distance is not in the defined range
    return null;
  }
  
  // Apply free delivery threshold first
  let exampleSubtotal: number;
  if (scenario === 'below') {
    exampleSubtotal = Math.max(1, charge.freeDeliveryThreshold - 10);
  } else {
    exampleSubtotal = charge.freeDeliveryThreshold + 10;
  }
  
  if (exampleSubtotal >= charge.freeDeliveryThreshold) {
    return 0; // Free delivery
  }
  
  // Calculate charge: base charge + per-km charge for the distance
  // The base charge itself might be for minDistance to maxDistance
  // So a simpler calculation is often more representative for examples
  return charge.baseCharge + (distance * charge.perKmCharge);
};

  // Get example distances that are relevant to the rule
  const getExampleDistances = (charge: DeliveryCharge) => {
    const distances = [];
    
    // Add the minimum distance
    if (charge.minDistance > 0) {
      distances.push(charge.minDistance);
    }
    
    // Add a distance in the middle of the range
    const midDistance = Math.round((charge.minDistance + charge.maxDistance) / 2);
    if (midDistance !== charge.minDistance && midDistance !== charge.maxDistance) {
      distances.push(midDistance);
    }
    
    // Add the maximum distance
    distances.push(charge.maxDistance);
    
    // If we don't have 3 distances, add some reasonable ones
    while (distances.length < 3) {
      if (charge.maxDistance <= 5) {
        // For short ranges, add smaller increments
        const newDist = Math.min(charge.maxDistance + 1, 5);
        if (!distances.includes(newDist)) {
          distances.push(newDist);
        }
      } else {
        // For longer ranges, add larger increments
        const newDist = Math.min(charge.maxDistance + 2, 15);
        if (!distances.includes(newDist)) {
          distances.push(newDist);
        }
      }
    }
    
    // Ensure we have exactly 3 distances and they're sorted
    return distances.slice(0, 3).sort((a, b) => a - b);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="h-8 w-8 text-red-600" />
            Delivery Charges
          </h1>
          <p className="text-gray-600 mt-2">
            Manage distance-based delivery charges and free delivery thresholds
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Delivery Charge
        </Button>
      </div>

      {/* Delivery Charges Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {deliveryCharges.map((charge) => (
          <div
            key={charge.id}
            className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all duration-200 hover:shadow-xl ${
              charge.isActive ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {charge.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {charge.minDistance} - {charge.maxDistance} km
                  </span>
                </div>
                {charge.storeId && (
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {stores.find(s => s.id === charge.storeId)?.name || 'Unknown Store'}
                    </span>
                  </div>
                )}
                {!charge.storeId && (
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 text-green-600">
                      Global Rule (All Stores)
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(charge)}
                  className="p-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(charge.id)}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pricing Details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Base Charge:</span>
                <span className="font-semibold text-gray-900">
                  ${charge.baseCharge.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Per KM Charge:</span>
                <span className="font-semibold text-gray-900">
                  ${charge.perKmCharge.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Free Delivery:</span>
                <span className="font-semibold text-green-600">
                  ${charge.freeDeliveryThreshold.toFixed(2)}+
                </span>
              </div>
            </div>

            {/* Example Calculations */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Example Charges:</h4>
              <p className="text-xs text-gray-500 mb-2">Showing charges for different order amounts</p>
              <div className="space-y-2 text-xs">
                {getExampleDistances(charge).map((distance, index) => {
                  const chargeBelow = calculateExampleCharge(charge, distance, 'below');
                  const chargeAbove = calculateExampleCharge(charge, distance, 'above');
                  
                  return (
                    <div key={index} className="border-b border-gray-200 pb-1 last:border-b-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{distance} km:</span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Order &lt; ${charge.freeDeliveryThreshold}:</span>
                          <span className="font-medium">
                            {chargeBelow !== null ? `$${chargeBelow.toFixed(2)}` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Order ≥ ${charge.freeDeliveryThreshold}:</span>
                          <span className="font-medium text-green-600">
                            {chargeAbove !== null ? 'Free' : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  charge.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {charge.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {deliveryCharges.length === 0 && (
        <div className="text-center py-12">
          <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No delivery charges configured</h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first distance-based delivery charge rule.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Delivery Charge
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCharge ? 'Edit Delivery Charge' : 'Add Delivery Charge'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Local Delivery, Extended Range"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Distance (km)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.minDistance}
                onChange={(e) => setFormData({ ...formData, minDistance: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Distance (km)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.maxDistance}
                onChange={(e) => setFormData({ ...formData, maxDistance: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Charge ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.baseCharge}
                onChange={(e) => setFormData({ ...formData, baseCharge: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per KM Charge ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.perKmCharge}
                onChange={(e) => setFormData({ ...formData, perKmCharge: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Free Delivery Threshold ($)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.freeDeliveryThreshold}
              onChange={(e) => setFormData({ ...formData, freeDeliveryThreshold: parseFloat(e.target.value) })}
              placeholder="Orders above this amount get free delivery"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store (Optional)
            </label>
            <Select
              value={formData.storeId}
              onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
            >
              <option value="">Global Rule (All Stores)</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to apply this rule to all stores, or select a specific store
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active (this rule will be applied to orders)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
              <Save className="h-4 w-4 mr-2" />
              {editingCharge ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryCharges;
