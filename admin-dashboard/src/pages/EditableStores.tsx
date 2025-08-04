import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Edit, Trash2, Store, Phone, Mail, MapPin, Clock, Check, X, Zap, Building2 } from 'lucide-react';
import { stores } from '../../../shared/store.config';

interface StoreInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  timezone: string;
  isActive: boolean;
  operatingHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  createdAt?: any;
  updatedAt?: any;
}

export const EditableStores = () => {
  const [storesData, loadingStores, error] = useCollection(
    query(collection(db, 'stores'), orderBy('name'))
  );
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editedData, setEditedData] = useState<Partial<StoreInfo>>({});
  const [isAutoCreating, setIsAutoCreating] = useState(false);

  const storesList = storesData?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as StoreInfo[] || [];

  const handleEdit = (storeId: string) => {
    const store = storesList.find(s => s.id === storeId);
    if (store) {
      setEditingStore(storeId);
      setEditedData({
        name: store.name,
        address: store.address,
        city: store.city,
        province: store.province,
        postalCode: store.postalCode,
        phone: store.phone,
        email: store.email,
        timezone: store.timezone,
        isActive: store.isActive,
        operatingHours: { ...store.operatingHours }
      });
    }
  };

  const handleSave = async (storeId: string) => {
    try {
      await updateDoc(doc(db, 'stores', storeId), {
        ...editedData,
        updatedAt: serverTimestamp()
      });
      setEditingStore(null);
      setEditedData({});
    } catch (error) {
      console.error('Error updating store:', error);
      alert('Failed to update store');
    }
  };

  const handleCancel = () => {
    setEditingStore(null);
    setEditedData({});
  };

  const handleDelete = async (storeId: string) => {
    if (window.confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'stores', storeId));
      } catch (error) {
        console.error('Error deleting store:', error);
        alert('Failed to delete store');
      }
    }
  };

  const handleAddStore = async () => {
    if (!editedData.name || !editedData.address || !editedData.phone) {
      alert('Please fill in required fields: Name, Address, and Phone');
      return;
    }

    try {
      const newStore: Omit<StoreInfo, 'id'> = {
        name: editedData.name || '',
        address: editedData.address || '',
        city: editedData.city || '',
        province: editedData.province || 'ON',
        postalCode: editedData.postalCode || '',
        phone: editedData.phone || '',
        email: editedData.email || '',
        timezone: editedData.timezone || 'America/Toronto',
        isActive: editedData.isActive ?? true,
        operatingHours: editedData.operatingHours || {
          monday: '11:00 AM - 10:00 PM',
          tuesday: '11:00 AM - 10:00 PM',
          wednesday: '11:00 AM - 10:00 PM',
          thursday: '11:00 AM - 10:00 PM',
          friday: '11:00 AM - 11:00 PM',
          saturday: '11:00 AM - 11:00 PM',
          sunday: '12:00 PM - 9:00 PM'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'stores'), newStore);
      setShowAddDialog(false);
      setEditedData({});
    } catch (error) {
      console.error('Error adding store:', error);
      alert('Failed to add store');
    }
  };

  const handleAutoCreate = async () => {
    if (window.confirm('This will create all Right Wingers store locations from the configuration. Continue?')) {
      setIsAutoCreating(true);
      try {
        const batch = writeBatch(db);
        
        for (const store of stores) {
          const storeRef = doc(collection(db, 'stores'));
          batch.set(storeRef, {
            name: store.name,
            address: store.address,
            city: store.city,
            province: store.province,
            postalCode: store.postalCode,
            phone: store.phone,
            email: `${store.city.toLowerCase().replace(/\s+/g, '')}@rightwingers.com`,
            timezone: 'America/Toronto',
            isActive: store.isActive,
            operatingHours: store.hours,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        await batch.commit();
        console.log('✅ All stores auto-created successfully');
      } catch (error) {
        console.error('Error auto-creating stores:', error);
        alert('Failed to auto-create stores');
      } finally {
        setIsAutoCreating(false);
      }
    }
  };

  const updateOperatingHours = (day: string, value: string) => {
    setEditedData({
      ...editedData,
      operatingHours: {
        ...editedData.operatingHours,
        [day]: value
      } as any
    });
  };

  if (loadingStores) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading stores...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">Error loading stores: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Store Management</h1>
              <p className="text-lg text-gray-600">Manage franchise locations and settings</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-[#800000] to-red-700 rounded-xl">
                <Building2 className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Store Locations</h2>
            <p className="text-gray-600">Manage your franchise locations</p>
          </div>
          <div className="flex gap-3">
            {storesList.length === 0 && (
              <Button 
                onClick={handleAutoCreate}
                disabled={isAutoCreating}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isAutoCreating ? 'Creating...' : 'Auto Create All Stores'}
              </Button>
            )}
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-[#800000] to-red-700 hover:from-red-800 hover:to-red-900 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Store
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {storesList.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <Store className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first store location or auto-creating all Right Wingers locations.</p>
            <div className="flex justify-center gap-3">
              <Button 
                onClick={handleAutoCreate}
                disabled={isAutoCreating}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isAutoCreating ? 'Creating...' : 'Auto Create All Stores'}
              </Button>
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-[#800000] to-red-700 hover:from-red-800 hover:to-red-900 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </div>
        )}

        {/* Stores Grid */}
        {storesList.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {storesList.map((store) => (
              <div key={store.id} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300">
                {/* Store Header */}
                <div className="bg-gradient-to-r from-[#800000] to-red-700 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Store className="h-6 w-6" />
                      </div>
                      <div>
                        {editingStore === store.id ? (
                          <Input
                            value={editedData.name || ''}
                            onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                            className="bg-white/20 border-white/30 text-white placeholder-white/70"
                            placeholder="Store Name"
                          />
                        ) : (
                          <h3 className="text-xl font-bold">{store.name}</h3>
                        )}
                        <p className="text-red-100 text-sm">Store ID: {store.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {editingStore === store.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSave(store.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleCancel}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleEdit(store.id)}
                            className="bg-white/20 hover:bg-white/30 text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDelete(store.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Store Details */}
                <div className="p-6 space-y-6">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 mb-1">Address</p>
                      {editingStore === store.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editedData.address || ''}
                            onChange={(e) => setEditedData({...editedData, address: e.target.value})}
                            placeholder="Street Address"
                            className="focus:ring-red-500 focus:border-red-500"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={editedData.city || ''}
                              onChange={(e) => setEditedData({...editedData, city: e.target.value})}
                              placeholder="City"
                              className="focus:ring-red-500 focus:border-red-500"
                            />
                            <Input
                              value={editedData.postalCode || ''}
                              onChange={(e) => setEditedData({...editedData, postalCode: e.target.value})}
                              placeholder="Postal Code"
                              className="focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-900">{store.address}, {store.city}, {store.province} {store.postalCode}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone</p>
                        {editingStore === store.id ? (
                          <Input
                            value={editedData.phone || ''}
                            onChange={(e) => setEditedData({...editedData, phone: e.target.value})}
                            placeholder="Phone Number"
                            className="focus:ring-red-500 focus:border-red-500"
                          />
                        ) : (
                          <p className="text-gray-900">{store.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        {editingStore === store.id ? (
                          <Input
                            value={editedData.email || ''}
                            onChange={(e) => setEditedData({...editedData, email: e.target.value})}
                            placeholder="Email Address"
                            className="focus:ring-red-500 focus:border-red-500"
                          />
                        ) : (
                          <p className="text-gray-900">{store.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <p className="text-sm font-medium text-gray-700">Operating Hours</p>
                    </div>
                    
                    {editingStore === store.id ? (
                      <div className="space-y-2">
                        {Object.entries(editedData.operatingHours || store.operatingHours).map(([day, hours]) => (
                          <div key={day} className="flex items-center gap-3">
                            <span className="w-20 text-sm font-medium text-gray-600 capitalize">{day}:</span>
                            <Input
                              value={hours}
                              onChange={(e) => updateOperatingHours(day, e.target.value)}
                              className="flex-1 focus:ring-red-500 focus:border-red-500"
                              placeholder="e.g., 11:00 AM - 10:00 PM"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {Object.entries(store.operatingHours).map(([day, hours]) => (
                          <div key={day} className="flex justify-between">
                            <span className="font-medium text-gray-600 capitalize">{day}:</span>
                            <span className="text-gray-900">{hours}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      {editingStore === store.id ? (
                        <select
                          value={editedData.isActive ? 'active' : 'inactive'}
                          onChange={(e) => setEditedData({...editedData, isActive: e.target.value === 'active'})}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          store.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {store.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Store Dialog */}
        {showAddDialog && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-[#800000] to-red-700 p-6 text-white">
                <h2 className="text-2xl font-bold">Add New Store</h2>
                <p className="text-red-100 mt-1">Create a new franchise location</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <Input
                    value={editedData.name || ''}
                    onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                    placeholder="Store Name (e.g., Right Wingers - Location)"
                    className="w-full focus:ring-red-500 focus:border-red-500"
                  />
                  <Input
                    value={editedData.address || ''}
                    onChange={(e) => setEditedData({...editedData, address: e.target.value})}
                    placeholder="Street Address"
                    className="w-full focus:ring-red-500 focus:border-red-500"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={editedData.city || ''}
                      onChange={(e) => setEditedData({...editedData, city: e.target.value})}
                      placeholder="City"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                    <Input
                      value={editedData.postalCode || ''}
                      onChange={(e) => setEditedData({...editedData, postalCode: e.target.value})}
                      placeholder="Postal Code"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      value={editedData.phone || ''}
                      onChange={(e) => setEditedData({...editedData, phone: e.target.value})}
                      placeholder="Phone Number"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                    <Input
                      value={editedData.email || ''}
                      onChange={(e) => setEditedData({...editedData, email: e.target.value})}
                      placeholder="Email Address"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Operating Hours</h3>
                  <div className="space-y-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center gap-3">
                        <span className="w-20 text-sm font-medium text-gray-600 capitalize">{day}:</span>
                        <Input
                          value={editedData.operatingHours?.[day as keyof typeof editedData.operatingHours] || '11:00 AM - 10:00 PM'}
                          onChange={(e) => updateOperatingHours(day, e.target.value)}
                          className="flex-1 focus:ring-red-500 focus:border-red-500"
                          placeholder="e.g., 11:00 AM - 10:00 PM"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setEditedData({});
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddStore}
                    className="bg-gradient-to-r from-[#800000] to-red-700 hover:from-red-800 hover:to-red-900 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Store
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 