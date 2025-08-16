import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Calendar, Filter, Download, Users, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { jobScheduler } from '../services/jobScheduler';
import { Button } from '../components/ui/Button';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string | { street: string; city: string; postalCode: string };
  city?: string;
  postalCode?: string;
  totalOrders?: number;
  orderCount?: number;
  totalSpent?: number;
  lastOrderDate?: string;
  createdAt?: string;
  notes?: string;
  storeId?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedDate?: string;
  blockedBy?: string;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'frequent' | 'inactive' | 'blocked'>('all');

  // Bulk selection state
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch customers on component mount
  useEffect(() => {
    setLoading(true);
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, filterType]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedCustomers(new Set());
    setSelectAll(false);
    setShowBulkActions(false);
  }, [searchQuery, filterType]);

  // Bulk selection functions
  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    const newSelected = new Set(selectedCustomers);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedCustomers(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCustomerIds = new Set(filteredCustomers.map(customer => customer.id));
      setSelectedCustomers(allCustomerIds);
      setSelectAll(true);
      setShowBulkActions(true);
    } else {
      setSelectedCustomers(new Set());
      setSelectAll(false);
      setShowBulkActions(false);
    }
  };

  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const pageCustomerIds = new Set(paginatedCustomers.map(customer => customer.id));
      setSelectedCustomers(pageCustomerIds);
      setSelectAll(false);
      setShowBulkActions(true);
    } else {
      setSelectedCustomers(new Set());
      setSelectAll(false);
      setShowBulkActions(false);
    }
  };

  const bulkDeleteCustomers = async () => {
    if (selectedCustomers.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete customers directly without calling individual handleDelete function
      const deletePromises = Array.from(selectedCustomers).map(customerId => 
        deleteDoc(doc(db, 'customers', customerId))
      );
      await Promise.all(deletePromises);
      
      // Clear selection after successful deletion
      setSelectedCustomers(new Set());
      setSelectAll(false);
      setShowBulkActions(false);
      
      // Refresh customers
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customers:', error);
      alert('Error deleting some customers. Please try again.');
    }
  };

  const exportCustomersToCSV = (customersToExport: Customer[]) => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Address', 'City', 'Postal Code', 'Total Orders', 'Total Spent', 'Last Order', 'Status', 'Notes'].join(','),
      ...customersToExport.map(customer => [
        customer.name,
        customer.email || 'N/A',
        customer.phone,
        typeof customer.address === 'string' ? customer.address : (customer.address as any)?.street || 'N/A',
        typeof customer.address === 'string' ? customer.city || 'N/A' : (customer.address as any)?.city || 'N/A',
        typeof customer.address === 'string' ? customer.postalCode || 'N/A' : (customer.address as any)?.postalCode || 'N/A',
        customer.totalOrders || customer.orderCount || 0,
        customer.totalSpent || 0,
        customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never',
        customer.isBlocked ? 'Blocked' : 'Active',
        customer.notes || 'N/A'
      ].join(','))
    ].join('\n');
    return csvContent;
  };

  const handleBulkExport = () => {
    const selectedCustomerData = Array.from(selectedCustomers).map(id => 
      customers.find(customer => customer.id === id)
    ).filter(Boolean);
    
    if (selectedCustomerData.length === 0) return;
    
    // Export selected customers to CSV
    const csvContent = exportCustomersToCSV(selectedCustomerData as Customer[]);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: '',
    totalOrders: 0,
    totalSpent: 0,
    isBlocked: false,
    blockedReason: '',
    blockedDate: '',
    blockedBy: ''
  });

  const fetchCustomers = async () => {
    try {
      const customersQuery = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(customersQuery);
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        customer.phone.includes(searchQuery)
      );
    }

    // Apply type filter
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filterType) {
      case 'recent':
        filtered = filtered.filter(customer => {
          const lastOrder = customer.lastOrderDate ? new Date(customer.lastOrderDate) : null;
          return lastOrder && lastOrder > thirtyDaysAgo;
        });
        break;
      case 'frequent':
        filtered = filtered.filter(customer => (customer.totalOrders || customer.orderCount || 0) >= 5);
        break;
      case 'inactive':
        filtered = filtered.filter(customer => {
          const lastOrder = customer.lastOrderDate ? new Date(customer.lastOrderDate) : null;
          return !lastOrder || lastOrder <= thirtyDaysAgo;
        });
        break;
      case 'blocked':
        filtered = filtered.filter(customer => customer.isBlocked);
        break;
    }

    setFilteredCustomers(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          totalOrders: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString()
        });
      }
      
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer.');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    
    // Handle different address formats
    let addressStr = '';
    let cityStr = '';
    let postalCodeStr = '';
    
    if (typeof customer.address === 'string') {
      addressStr = customer.address || '';
      cityStr = customer.city || '';
      postalCodeStr = customer.postalCode || '';
    } else if (customer.address && typeof customer.address === 'object') {
      addressStr = customer.address.street || '';
      cityStr = customer.address.city || '';
      postalCodeStr = customer.address.postalCode || '';
    }
    
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      address: addressStr,
      city: cityStr,
      postalCode: postalCodeStr,
      notes: customer.notes || '',
      totalOrders: customer.totalOrders || customer.orderCount || 0,
      totalSpent: customer.totalSpent || 0,
      isBlocked: customer.isBlocked || false,
      blockedReason: customer.blockedReason || '',
      blockedDate: customer.blockedDate || '',
      blockedBy: customer.blockedBy || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (customerId: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteDoc(doc(db, 'customers', customerId));
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Failed to delete customer.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      notes: '',
      totalOrders: 0,
      totalSpent: 0,
      isBlocked: false,
      blockedReason: '',
      blockedDate: '',
      blockedBy: ''
    });
    setEditingCustomer(null);
    setShowAddDialog(false);
  };

  const stats = {
    total: customers.length,
    recent: customers.filter(c => {
      const lastOrder = c.lastOrderDate ? new Date(c.lastOrderDate) : null;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return lastOrder && lastOrder > thirtyDaysAgo;
    }).length,
    frequent: customers.filter(c => (c.totalOrders || c.orderCount || 0) >= 5).length,
    blocked: customers.filter(c => c.isBlocked).length,
    totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  };

  const updateCustomerStats = async () => {
    try {
      console.log('🔄 Running manual customer sync...');
      setLoading(true);
      
      // Use the job scheduler to run the customer sync
      await jobScheduler.runManualJob('customer_sync');
      
      // Refresh the page data to show updated stats
      await fetchCustomers();
      
      // Show success notification
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000); // Hide after 3 seconds
      
    } catch (error) {
      console.error('❌ Error running customer sync:', error);
      // Don't show alert, just log the error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading customers...</div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Success Notification */}
      {syncSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-in slide-in-from-top-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Customer statistics updated successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1">Manage your customer database and relationships</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={updateCustomerStats}
            disabled={loading}
            className={`transition-all duration-500 ${
              loading 
                ? 'bg-purple-500 text-white cursor-not-allowed shadow-lg scale-105' 
                : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg hover:scale-105'
            }`}
            title="Update customer order counts and spending from actual orders"
          >
            <RefreshCw className={`h-4 w-4 mr-2 transition-all duration-500 ${
              loading ? 'animate-spin' : 'hover:rotate-180'
            }`} />
            {loading ? 'Syncing...' : 'Sync Orders'}
          </Button>
          <Button
            onClick={() => {
              const csvContent = exportCustomersToCSV(filteredCustomers);
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `all-customers-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <Phone className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Frequent Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.frequent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <span className="text-2xl">🚫</span>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Blocked Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.blocked}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <span className="text-2xl">💰</span>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Customers</option>
              <option value="recent">Recent (30 days)</option>
              <option value="frequent">Frequent (5+ orders)</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked Customers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {selectedCustomers.size} customer(s) selected
                </span>
                <span className="text-xs text-gray-500">
                  • Total Spent: ${Array.from(selectedCustomers)
                    .map(id => customers.find(customer => customer.id === id)?.totalSpent || 0)
                    .reduce((sum, total) => sum + total, 0)
                    .toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomers(new Set());
                  setSelectAll(false);
                  setShowBulkActions(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBulkExport}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Export ({selectedCustomers.size})
              </Button>
              <Button
                onClick={bulkDeleteCustomers}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedCustomers.size})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === paginatedCustomers.length && paginatedCustomers.length > 0}
                      onChange={(e) => handleSelectAllOnPage(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span>Select</span>
                    {filteredCustomers.length > paginatedCustomers.length && (
                      <button
                        onClick={() => handleSelectAll(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                        title={`Select all ${filteredCustomers.length} customers (not just this page)`}
                      >
                        All ({filteredCustomers.length})
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery || filterType !== 'all' ? 'No customers found matching your criteria.' : 'No customers yet. Add your first customer!'}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id)}
                        onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        {customer.notes && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{customer.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-1" />
                            {customer.email}
                          </div>
                        )}
                        <div className="flex items-center mt-1">
                          <Phone className="h-4 w-4 text-gray-400 mr-1" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.address && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            <div>
                              <div>
                                {typeof customer.address === 'string' 
                                  ? customer.address 
                                  : (customer.address as any)?.street}
                              </div>
                              {((customer.city && customer.postalCode) || 
                                (typeof customer.address === 'object' && (customer.address as any)?.city)) && (
                                <div className="text-gray-500">
                                  {typeof customer.address === 'string' 
                                    ? `${customer.city} ${customer.postalCode}`
                                    : `${(customer.address as any)?.city} ${(customer.address as any)?.postalCode}`}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.isBlocked ? (
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
                            Blocked
                          </span>
                          <div className="ml-2 text-xs text-red-600">
                            {customer.blockedReason && (
                              <div title={customer.blockedReason} className="truncate max-w-32">
                                {customer.blockedReason}
                              </div>
                            )}
                            {customer.blockedDate && (
                              <div className="text-gray-500">
                                {new Date(customer.blockedDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {(customer.totalOrders || customer.orderCount || 0)} orders
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(customer.totalSpent || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-lg border ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Customer Dialog */}
      {showAddDialog && (
        <div 
          className="fixed inset-0 z-[60] flex justify-center items-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button onClick={resetForm} className="p-2 rounded-full hover:bg-gray-200">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes about this customer..."
                />
              </div>
              
              {/* Blocked Status Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">Customer Status</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isBlocked"
                      checked={formData.isBlocked}
                      onChange={(e) => setFormData({...formData, isBlocked: e.target.checked})}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isBlocked" className="ml-2 text-sm font-medium text-red-600">
                      Block Customer
                    </label>
                  </div>
                </div>
                
                {formData.isBlocked && (
                  <div className="space-y-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-1">Block Reason *</label>
                      <textarea
                        value={formData.blockedReason}
                        onChange={(e) => setFormData({...formData, blockedReason: e.target.value})}
                        required={formData.isBlocked}
                        rows={2}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Reason for blocking this customer..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-red-700 mb-1">Block Date</label>
                        <input
                          type="date"
                          value={formData.blockedDate}
                          onChange={(e) => setFormData({...formData, blockedDate: e.target.value})}
                          className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-red-700 mb-1">Blocked By</label>
                        <input
                          type="text"
                          value={formData.blockedBy}
                          onChange={(e) => setFormData({...formData, blockedBy: e.target.value})}
                          className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Admin name"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers; 