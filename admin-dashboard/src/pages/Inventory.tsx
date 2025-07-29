import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../services/auth';
import { useSelectedStore } from '../context/SelectedStoreContext';
import StoreSelector from '../components/StoreSelector';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Store,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  cost: number;
  price: number;
  supplier: string;
  location: string;
  description?: string;
  lastUpdated: string;
  lastRestocked?: string;
  reorderPoint: number;
  isActive: boolean;
  storeId: string;
}

interface InventoryCategory {
  id: string;
  name: string;
  color: string;
}

interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring';
  itemId: string;
  itemName: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  isResolved: boolean;
  storeId: string;
}

const Inventory = () => {
  const { currentUser } = useAuth();
  const { selectedStore, setSelectedStore } = useSelectedStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAlerts, setShowAlerts] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    currentStock: 0,
    minStockLevel: 10,
    maxStockLevel: 100,
    unit: 'units',
    cost: 0,
    price: 0,
    supplier: '',
    location: '',
    description: '',
    reorderPoint: 20
  });

  // Default categories
  const defaultCategories: InventoryCategory[] = [
    { id: 'ingredients', name: 'Ingredients', color: 'bg-blue-100 text-blue-800' },
    { id: 'packaging', name: 'Packaging', color: 'bg-green-100 text-green-800' },
    { id: 'equipment', name: 'Equipment', color: 'bg-purple-100 text-purple-800' },
    { id: 'cleaning', name: 'Cleaning Supplies', color: 'bg-orange-100 text-orange-800' },
    { id: 'office', name: 'Office Supplies', color: 'bg-gray-100 text-gray-800' },
    { id: 'beverages', name: 'Beverages', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    if (selectedStore) {
      fetchInventory();
      fetchCategories();
      fetchAlerts();
    }
  }, [selectedStore]);

  const fetchInventory = async () => {
    if (!selectedStore) return;
    
    try {
      setLoading(true);
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('storeId', '==', selectedStore.id),
        orderBy('name')
      );
      const snapshot = await getDocs(inventoryQuery);
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesQuery = query(collection(db, 'inventoryCategories'), orderBy('name'));
      const snapshot = await getDocs(categoriesQuery);
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryCategory[];
      
      // Combine default categories with custom ones
      const allCategories = [...defaultCategories];
      categoriesData.forEach(cat => {
        if (!allCategories.find(c => c.id === cat.id)) {
          allCategories.push(cat);
        }
      });
      setCategories(allCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(defaultCategories);
    }
  };

  const fetchAlerts = async () => {
    if (!selectedStore) return;
    
    try {
      const alertsQuery = query(
        collection(db, 'inventoryAlerts'),
        where('storeId', '==', selectedStore.id),
        where('isResolved', '==', false),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(alertsQuery);
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryAlert[];
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedStore) return;
    
    try {
      const itemData = {
        ...formData,
        storeId: selectedStore.id,
        lastUpdated: serverTimestamp(),
        isActive: true
      };

      const docRef = await addDoc(collection(db, 'inventory'), itemData);
      
      setShowAddDialog(false);
      resetForm();
      fetchInventory();
      
      // Check for alerts after adding
      const newItem: InventoryItem = {
        id: docRef.id,
        ...formData,
        storeId: selectedStore.id,
        lastUpdated: new Date().toISOString(),
        isActive: true
      };
      checkForAlerts(newItem);
    } catch (error) {
      console.error('Error adding inventory item:', error);
      alert('Error adding inventory item. Please try again.');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    
    try {
      const itemRef = doc(db, 'inventory', editingItem.id);
      await updateDoc(itemRef, {
        ...formData,
        lastUpdated: serverTimestamp()
      });
      
      setEditingItem(null);
      resetForm();
      fetchInventory();
      
      // Check for alerts after updating
      checkForAlerts({ ...editingItem, ...formData });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      alert('Error updating inventory item. Please try again.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      fetchInventory();
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      alert('Error deleting inventory item. Please try again.');
    }
  };

  const handleStockAdjustment = async (itemId: string, adjustment: number, type: 'add' | 'remove') => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;
      
      const newStock = type === 'add' ? item.currentStock + adjustment : item.currentStock - adjustment;
      if (newStock < 0) {
        alert('Stock cannot go below 0');
        return;
      }
      
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, {
        currentStock: newStock,
        lastUpdated: serverTimestamp(),
        lastRestocked: type === 'add' ? serverTimestamp() : item.lastRestocked
      });
      
      fetchInventory();
      checkForAlerts({ ...item, currentStock: newStock });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error adjusting stock. Please try again.');
    }
  };

  const checkForAlerts = async (item: InventoryItem) => {
    const newAlerts: Partial<InventoryAlert>[] = [];
    
    // Low stock alert
    if (item.currentStock <= item.reorderPoint && item.currentStock > 0) {
      newAlerts.push({
        type: 'low_stock',
        itemId: item.id,
        itemName: item.name,
        message: `${item.name} is running low (${item.currentStock} ${item.unit} remaining)`,
        severity: 'medium',
        isResolved: false,
        storeId: selectedStore?.id
      });
    }
    
    // Out of stock alert
    if (item.currentStock === 0) {
      newAlerts.push({
        type: 'out_of_stock',
        itemId: item.id,
        itemName: item.name,
        message: `${item.name} is out of stock`,
        severity: 'high',
        isResolved: false,
        storeId: selectedStore?.id
      });
    }
    
    // Overstock alert
    if (item.currentStock > item.maxStockLevel) {
      newAlerts.push({
        type: 'overstock',
        itemId: item.id,
        itemName: item.name,
        message: `${item.name} is overstocked (${item.currentStock} ${item.unit})`,
        severity: 'low',
        isResolved: false,
        storeId: selectedStore?.id
      });
    }
    
    // Add alerts to database
    for (const alert of newAlerts) {
      await addDoc(collection(db, 'inventoryAlerts'), {
        ...alert,
        createdAt: serverTimestamp()
      });
    }
    
    fetchAlerts();
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const alertRef = doc(db, 'inventoryAlerts', alertId);
      await updateDoc(alertRef, {
        isResolved: true
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      currentStock: 0,
      minStockLevel: 10,
      maxStockLevel: 100,
      unit: 'units',
      cost: 0,
      price: 0,
      supplier: '',
      location: '',
      description: '',
      reorderPoint: 20
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      currentStock: item.currentStock,
      minStockLevel: item.minStockLevel,
      maxStockLevel: item.maxStockLevel,
      unit: item.unit,
      cost: item.cost,
      price: item.price,
      supplier: item.supplier,
      location: item.location,
      description: item.description || '',
      reorderPoint: item.reorderPoint
    });
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock === 0) return { status: 'out_of_stock', color: 'bg-red-100 text-red-800' };
    if (item.currentStock <= item.reorderPoint) return { status: 'low_stock', color: 'bg-yellow-100 text-yellow-800' };
    if (item.currentStock > item.maxStockLevel) return { status: 'overstock', color: 'bg-blue-100 text-blue-800' };
    return { status: 'normal', color: 'bg-green-100 text-green-800' };
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4" />;
      case 'out_of_stock':
        return <X className="h-4 w-4" />;
      case 'overstock':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && item.currentStock <= item.reorderPoint) ||
                        (stockFilter === 'out' && item.currentStock === 0) ||
                        (stockFilter === 'overstock' && item.currentStock > item.maxStockLevel);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);
  const lowStockItems = inventory.filter(item => item.currentStock <= item.reorderPoint && item.currentStock > 0).length;
  const outOfStockItems = inventory.filter(item => item.currentStock === 0).length;

  if (!selectedStore) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Select a Store</h2>
            <p className="text-gray-600 mb-6">
              Please select a store to manage inventory for that location.
            </p>
            <div className="max-w-md mx-auto">
              <StoreSelector />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Once you select a store, you'll be able to manage inventory for that location.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">
            Manage inventory for {selectedStore.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Store:</span>
            <StoreSelector />
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockItems}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
            </div>
            <X className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && showAlerts && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Inventory Alerts</h2>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => resolveAlert(alert.id)}
                    variant="outline"
                    size="sm"
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Items</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, SKU, or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
            <Select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">All Items</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="overstock">Overstocked</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Inventory Items ({filteredInventory.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading inventory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No inventory items found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                            {item.location && (
                              <div className="text-xs text-gray-400">Location: {item.location}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {item.currentStock} {item.unit}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color}`}>
                              {stockStatus.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Min: {item.minStockLevel} | Max: {item.maxStockLevel}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            ${(item.currentStock * item.cost).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Cost: ${item.cost} | Price: ${item.price}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            categories.find(c => c.id === item.category)?.color || 'bg-gray-100 text-gray-800'
                          }`}>
                            {categories.find(c => c.id === item.category)?.name || item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.supplier}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleStockAdjustment(item.id, 1, 'add')}
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleStockAdjustment(item.id, 1, 'remove')}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => openEditDialog(item)}
                              size="sm"
                              variant="outline"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteItem(item.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {(showAddDialog || editingItem) && (
        <div 
          className="fixed inset-0 z-[60] flex justify-center items-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Inventory Item' : 'Add New Item'}
              </h2>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter item name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <Input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Enter SKU"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <Input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., units, kg, liters"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <Input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit</label>
                  <Input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <Input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Enter supplier name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <Input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Shelf A1, Storage Room"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                  <Input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, minStockLevel: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
                  <Input
                    type="number"
                    value={formData.maxStockLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxStockLevel: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                  <Input
                    type="number"
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter item description..."
                  className="w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingItem ? handleUpdateItem : handleAddItem}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory; 