import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Calendar, Filter, Download, Users, RefreshCw } from 'lucide-react';

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
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'frequent' | 'inactive'>('all');

  // Fetch customers on component mount
  useEffect(() => {
    setLoading(true);
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, filterType]);

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
    totalSpent: 0
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
      totalSpent: customer.totalSpent || 0
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
      totalSpent: 0
    });
    setEditingCustomer(null);
    setShowAddDialog(false);
  };

  const exportCustomers = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Address', 'City', 'Postal Code', 'Total Orders', 'Total Spent', 'Last Order Date', 'Notes'].join(','),
      ...filteredCustomers.map(customer => [
        customer.name,
        customer.email,
        customer.phone,
        customer.address || '',
        customer.city || '',
        customer.postalCode || '',
        customer.totalOrders || customer.orderCount || 0,
        customer.totalSpent || 0,
        customer.lastOrderDate || '',
        customer.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: customers.length,
    recent: customers.filter(c => {
      const lastOrder = c.lastOrderDate ? new Date(c.lastOrderDate) : null;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return lastOrder && lastOrder > thirtyDaysAgo;
    }).length,
    frequent: customers.filter(c => (c.totalOrders || c.orderCount || 0) >= 5).length,
    totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  };

  const updateCustomerStats = async () => {
    try {
      console.log('🔄 Updating customer statistics...');
      setLoading(true);
      
      // Add a minimum loading time so users can see the animation
      const startTime = Date.now();
      const minLoadingTime = 1500; // 1.5 seconds minimum

      // Fetch all orders
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 Found ${orders.length} total orders`);

      // Group orders by customer phone number
      const customerStats = new Map<string, { 
        orderCount: number; 
        totalSpent: number; 
        lastOrderDate: string;
        customerId?: string;
      }>();

      orders.forEach((order: any) => {
        // Get customer phone from either format
        const phone = order.customerInfo?.phone || order.customerPhone;
        if (!phone) return;

        const cleanPhone = phone.replace(/\D/g, '');
        const orderTotal = order.total || 0;
        const orderDate = order.createdAt || new Date().toISOString();

        if (!customerStats.has(cleanPhone)) {
          customerStats.set(cleanPhone, {
            orderCount: 0,
            totalSpent: 0,
            lastOrderDate: orderDate
          });
        }

        const stats = customerStats.get(cleanPhone)!;
        stats.orderCount += 1;
        stats.totalSpent += orderTotal;
        
        // Keep the most recent order date
        if (orderDate > stats.lastOrderDate) {
          stats.lastOrderDate = orderDate;
        }
      });

      console.log(`📈 Calculated stats for ${customerStats.size} customers`);

      // Helper function to safely format date
      const formatDate = (dateString: string) => {
        if (typeof dateString !== 'string') {
          return new Date().toISOString().split('T')[0];
        }
        return dateString.split('T')[0];
      };

      // Update each customer's statistics
      const updatePromises = customers.map(async (customer) => {
        const cleanPhone = customer.phone.replace(/\D/g, '');
        const stats = customerStats.get(cleanPhone);
        
        if (stats) {
          const formattedLastOrderDate = formatDate(stats.lastOrderDate);
          
          if (
            customer.orderCount !== stats.orderCount || 
            customer.totalSpent !== stats.totalSpent ||
            customer.lastOrderDate !== formattedLastOrderDate
          ) {
            console.log(`📝 Updating ${customer.name}: ${stats.orderCount} orders, $${stats.totalSpent.toFixed(2)}`);
            
            const customerRef = doc(db, 'customers', customer.id);
            await updateDoc(customerRef, {
              orderCount: stats.orderCount,
              totalOrders: stats.orderCount, // Update both fields for compatibility
              totalSpent: stats.totalSpent,
              lastOrderDate: formattedLastOrderDate,
              updatedAt: new Date().toISOString()
            });
            
            return {
              ...customer,
              orderCount: stats.orderCount,
              totalOrders: stats.orderCount,
              totalSpent: stats.totalSpent,
              lastOrderDate: formattedLastOrderDate
            };
          }
        }
        return customer;
      });

      const updatedCustomers = await Promise.all(updatePromises);
      setCustomers(updatedCustomers);
      
      console.log('✅ Customer statistics updated successfully!');
      
      // Refresh the page data to show updated stats
      await fetchCustomers();
      
      // Ensure minimum loading time has passed
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      // Show success notification
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000); // Hide after 3 seconds
      
    } catch (error) {
      console.error('❌ Error updating customer stats:', error);
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
          <button
            onClick={updateCustomerStats}
            disabled={loading}
            className={`flex items-center px-4 py-2 rounded-lg transition-all duration-500 ${
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
          </button>
          <button
            onClick={exportCustomers}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            </select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery || filterType !== 'all' ? 'No customers found matching your criteria.' : 'No customers yet. Add your first customer!'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
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
                        {(customer.address || (typeof customer.address === 'object' && customer.address.street)) && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            <div>
                              <div>
                                {typeof customer.address === 'string' 
                                  ? customer.address 
                                  : customer.address?.street}
                              </div>
                              {((customer.city && customer.postalCode) || 
                                (typeof customer.address === 'object' && customer.address?.city)) && (
                                <div className="text-gray-500">
                                  {typeof customer.address === 'string' 
                                    ? `${customer.city} ${customer.postalCode}`
                                    : `${customer.address?.city} ${customer.address?.postalCode}`}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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
        </div>
      </div>

      {/* Add/Edit Customer Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
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