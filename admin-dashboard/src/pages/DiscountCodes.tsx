import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Search, Edit, Trash2, Copy, Percent, Calendar, Users, DollarSign, Tag } from 'lucide-react';

interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage or fixed amount
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  applicableTo: 'all' | 'pickup' | 'delivery' | 'dine-in';
  createdAt: string;
  updatedAt: string;
}

const DiscountCodes = () => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    minOrderAmount: 0,
    maxDiscount: 0,
    usageLimit: 0,
    isActive: true,
    startDate: '',
    endDate: '',
    applicableTo: 'all' as 'all' | 'pickup' | 'delivery' | 'dine-in'
  });

  // Fetch discount codes on component mount
  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  useEffect(() => {
    filterCodes();
  }, [discountCodes, searchQuery, filterType]);

  const fetchDiscountCodes = async () => {
    try {
      setLoading(true);
      const codesQuery = query(collection(db, 'discountCodes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(codesQuery);
      const codesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiscountCode[];
      setDiscountCodes(codesData);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCodes = () => {
    let filtered = discountCodes;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(code =>
        code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    const now = new Date();
    switch (filterType) {
      case 'active':
        filtered = filtered.filter(code => 
          code.isActive && 
          (!code.endDate || new Date(code.endDate) > now) &&
          (!code.usageLimit || code.usedCount < code.usageLimit)
        );
        break;
      case 'inactive':
        filtered = filtered.filter(code => !code.isActive);
        break;
      case 'expired':
        filtered = filtered.filter(code => 
          code.endDate && new Date(code.endDate) <= now
        );
        break;
    }

    setFilteredCodes(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const codeData = {
        ...formData,
        usedCount: editingCode?.usedCount || 0,
        createdAt: editingCode?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingCode) {
        // Update existing code
        const codeRef = doc(db, 'discountCodes', editingCode.id);
        await updateDoc(codeRef, codeData);
        console.log('✅ Discount code updated successfully');
      } else {
        // Create new code
        await addDoc(collection(db, 'discountCodes'), codeData);
        console.log('✅ Discount code created successfully');
      }

      await fetchDiscountCodes();
      resetForm();
      
    } catch (error) {
      console.error('Error saving discount code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      name: code.name,
      description: code.description || '',
      type: code.type,
      value: code.value,
      minOrderAmount: code.minOrderAmount || 0,
      maxDiscount: code.maxDiscount || 0,
      usageLimit: code.usageLimit || 0,
      isActive: code.isActive,
      startDate: code.startDate || '',
      endDate: code.endDate || '',
      applicableTo: code.applicableTo
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (codeId: string) => {
    if (window.confirm('Are you sure you want to delete this discount code?')) {
      try {
        await deleteDoc(doc(db, 'discountCodes', codeId));
        await fetchDiscountCodes();
        console.log('✅ Discount code deleted successfully');
      } catch (error) {
        console.error('Error deleting discount code:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      minOrderAmount: 0,
      maxDiscount: 0,
      usageLimit: 0,
      isActive: true,
      startDate: '',
      endDate: '',
      applicableTo: 'all'
    });
    setEditingCode(null);
    setShowAddDialog(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const getStatusBadge = (code: DiscountCode) => {
    const now = new Date();
    const isExpired = code.endDate && new Date(code.endDate) <= now;
    const isUsageExceeded = code.usageLimit && code.usedCount >= code.usageLimit;
    
    if (!code.isActive) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>;
    }
    if (isExpired) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Expired</span>;
    }
    if (isUsageExceeded) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Usage Limit Reached</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
  };

  const getUsagePercentage = (code: DiscountCode) => {
    if (!code.usageLimit) return 0;
    return Math.round((code.usedCount / code.usageLimit) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-gray-600 mt-1">Manage promotional codes and discounts</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Discount Code
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <Tag className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Codes</p>
              <p className="text-2xl font-bold text-gray-900">{discountCodes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <Percent className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Codes</p>
              <p className="text-2xl font-bold text-gray-900">
                {discountCodes.filter(code => code.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {discountCodes.reduce((sum, code) => sum + code.usedCount, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Average Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${discountCodes.length > 0 ? (discountCodes.reduce((sum, code) => sum + code.value, 0) / discountCodes.length).toFixed(0) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search discount codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Codes</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Discount Codes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading discount codes...</p>
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No discount codes found
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {code.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy code"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{code.name}</div>
                        {code.description && (
                          <div className="text-sm text-gray-500">{code.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        code.type === 'percentage' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {code.type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {code.type === 'percentage' ? `${code.value}%` : `$${code.value.toFixed(2)}`}
                      {code.maxDiscount && code.type === 'percentage' && (
                        <div className="text-xs text-gray-500">Max: ${code.maxDiscount.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {code.usedCount} / {code.usageLimit || '∞'}
                      </div>
                      {code.usageLimit && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${getUsagePercentage(code)}%` }}
                          ></div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(code)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(code)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCode ? 'Edit Discount Code' : 'Add New Discount Code'}
              </h2>
              <button onClick={resetForm} className="p-2 rounded-full hover:bg-gray-200">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="SAVE10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10% Off"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'percentage' | 'fixed'})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value * ({formData.type === 'percentage' ? '%' : '$'})
                  </label>
                  <input
                    type="number"
                    step={formData.type === 'percentage' ? '1' : '0.01'}
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applicable To</label>
                  <select
                    value={formData.applicableTo}
                    onChange={(e) => setFormData({...formData, applicableTo: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Orders</option>
                    <option value="pickup">Pickup Only</option>
                    <option value="delivery">Delivery Only</option>
                    <option value="dine-in">Dine-in Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({...formData, minOrderAmount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.type === 'percentage' ? 'Maximum Discount' : 'Maximum Usage'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({...formData, maxDiscount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={formData.type === 'percentage' ? '0.00' : '0'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({...formData, usageLimit: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0 (unlimited)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingCode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodes; 