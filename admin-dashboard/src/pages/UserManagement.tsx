import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit, Trash2, Shield, Store, User as UserIcon, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  User 
} from '../../../shared/user.config';

interface StoreData {
  id: string;
  name: string;
  isActive: boolean;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  
  // Fetch stores from Firebase database
  const [storesData, loadingStores] = useCollection(
    query(collection(db, 'stores'), where('isActive', '==', true), orderBy('name'))
  );

  const stores: StoreData[] = storesData?.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    isActive: doc.data().isActive
  })) || [];
  
  // Load users on component mount
  useEffect(() => {
    setUsers(getAllUsers());
  }, []);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee' as User['role'],
    assignedStoreId: '',
    password: ''
  });

  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'master_admin': return Shield;
      case 'store_admin': return Store;
      case 'employee': return UserIcon;
      default: return UserIcon;
    }
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'master_admin': return 'text-purple-600 bg-purple-100';
      case 'store_admin': return 'text-blue-600 bg-blue-100';
      case 'employee': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStoreName = (storeId?: string) => {
    if (!storeId) return 'All Stores';
    return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
  };

  const filteredUsers = users.filter(user => {
    if (filterStore !== 'all' && user.assignedStoreId !== filterStore) return false;
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    return true;
  });

  const handleCreateUser = () => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      ...formData,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setUsers([...users, newUser]);
    setFormData({ name: '', email: '', phone: '', role: 'employee', assignedStoreId: '', password: '' });
    setShowCreateDialog(false);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    
    setUsers(users.map(user => 
      user.id === selectedUser.id 
        ? { ...user, ...formData }
        : user
    ));
    
    setFormData({ name: '', email: '', phone: '', role: 'employee', assignedStoreId: '', password: '' });
    setSelectedUser(null);
    setShowEditDialog(false);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      assignedStoreId: user.assignedStoreId || '',
      password: ''
    });
    setShowEditDialog(true);
  };

  // Show loading state while stores are being fetched
  if (loadingStores) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading user management...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage franchise staff and access control</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'master_admin').length}
              </div>
              <div className="text-sm text-gray-600">Master Admins</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'store_admin').length}
              </div>
              <div className="text-sm text-gray-600">Store Admins</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'employee').length}
              </div>
              <div className="text-sm text-gray-600">Employees</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-700">Filter by Store:</span>
            <Select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
              <option value="all">All Stores</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-700">Filter by Role:</span>
            <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="master_admin">Master Admin</option>
              <option value="store_admin">Store Admin</option>
              <option value="employee">Employee</option>
            </Select>
          </div>

          <div className="ml-auto text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
            {stores.length > 0 && (
              <span className="ml-2 text-green-600">• {stores.length} stores available</span>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-900">User</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Role</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Store</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Contact</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Last Login</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const IconComponent = getRoleIcon(user.role);
                return (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getRoleColor(user.role)}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {getStoreName(user.assignedStoreId)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{user.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-600">
                        {user.lastLogin || 'Never'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.role !== 'master_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md w-full p-0 bg-white rounded-2xl border shadow-2xl [&>button]:hidden">
          <div className="bg-gradient-to-r from-blue-800 to-blue-900 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Create New User</h2>
                <p className="text-blue-100">Add a new staff member to the system</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
              >
                <option value="employee">Employee</option>
                <option value="store_admin">Store Admin</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Store</label>
              <Select
                value={formData.assignedStoreId}
                onChange={(e) => setFormData({ ...formData, assignedStoreId: e.target.value })}
              >
                <option value="">Select Store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </Select>
              {stores.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  ⚠️ No stores available. Please create stores first in Store Management.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!formData.name || !formData.email || !formData.password}
              >
                Create User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md w-full p-0 bg-white rounded-2xl border shadow-2xl [&>button]:hidden">
          <div className="bg-gradient-to-r from-green-800 to-green-900 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Edit className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Edit User</h2>
                <p className="text-green-100">Update staff member information</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
              >
                <option value="employee">Employee</option>
                <option value="store_admin">Store Admin</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Store</label>
              <Select
                value={formData.assignedStoreId}
                onChange={(e) => setFormData({ ...formData, assignedStoreId: e.target.value })}
              >
                <option value="">Select Store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </Select>
              {stores.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  ⚠️ No stores available. Please create stores first in Store Management.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditUser}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!formData.name || !formData.email}
              >
                Update User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 
