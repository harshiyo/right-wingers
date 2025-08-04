import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../services/auth';
import { notifyPermissionChange } from '../services/notificationService';
import { 
  Users, 
  Shield, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Check,
  Eye,
  EyeOff,
  UserCheck,
  Building,
  Store,
  ChefHat,
  ClipboardList,
  BarChart3,
  Tags,
  FileText,
  Bell,
  Calendar,
  CreditCard,
  Package,
  Truck,
  Globe,
  Monitor,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Package2,
  Building2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'master_admin' | 'store_admin' | 'employee';
  assignedStoreId?: string;
  assignedStoreName?: string;
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Store {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

interface RolePermission {
  id: string;
  name: string;
  description: string;
  category: 'management' | 'operations' | 'reports' | 'settings';
  icon: React.ComponentType<any>;
  isEnabled: boolean;
}

const RoleManagement = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [expandedCategory, setExpandedCategory] = useState<string>('management');

  // Available permissions/modules
  const [availablePermissions, setAvailablePermissions] = useState<RolePermission[]>([
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'View main dashboard and overview',
      category: 'management',
      icon: BarChart3,
      isEnabled: true
    },
    {
      id: 'stores',
      name: 'Store Management',
      description: 'Manage store information and settings',
      category: 'management',
      icon: Store,
      isEnabled: true
    },
    {
      id: 'orders',
      name: 'Orders',
      description: 'View and manage customer orders',
      category: 'operations',
      icon: ClipboardList,
      isEnabled: true
    },
    {
      id: 'kitchen',
      name: 'Kitchen Display',
      description: 'View kitchen orders and preparation status',
      category: 'operations',
      icon: ChefHat,
      isEnabled: true
    },
    {
      id: 'customers',
      name: 'Customer Management',
      description: 'View and manage customer information',
      category: 'management',
      icon: Users,
      isEnabled: true
    },
    {
      id: 'menu',
      name: 'Menu Management',
      description: 'Manage menu items, categories, and pricing',
      category: 'management',
      icon: FileText,
      isEnabled: true
    },
    {
      id: 'toppings',
      name: 'Toppings Management',
      description: 'Manage pizza toppings and ingredients',
      category: 'management',
      icon: Package,
      isEnabled: true
    },
    {
      id: 'sauces',
      name: 'Sauces Management',
      description: 'Manage wing sauces and dips',
      category: 'management',
      icon: Tags,
      isEnabled: true
    },
    {
      id: 'combos',
      name: 'Combo Management',
      description: 'Manage combo meals and packages',
      category: 'management',
      icon: Package,
      isEnabled: true
    },
    {
      id: 'categories',
      name: 'Categories',
      description: 'Manage menu categories and organization',
      category: 'management',
      icon: FileText,
      isEnabled: true
    },
    {
      id: 'feedback',
      name: 'Customer Feedback',
      description: 'View and respond to customer feedback',
      category: 'management',
      icon: Bell,
      isEnabled: true
    },
    {
      id: 'marketing',
      name: 'Marketing',
      description: 'Send promotional messages to customers',
      category: 'management',
      icon: Megaphone,
      isEnabled: true
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      description: 'Manage store inventory and stock levels',
      category: 'management',
      icon: Package2,
      isEnabled: true
    },
    {
      id: 'job_status',
      name: 'Job Status',
      description: 'Monitor automated jobs and schedules',
      category: 'reports',
      icon: BarChart3,
      isEnabled: true
    },
    {
      id: 'live_logs',
      name: 'Live Logs',
      description: 'View system logs and activity',
      category: 'reports',
      icon: FileText,
      isEnabled: true
    },
    {
      id: 'discount_codes',
      name: 'Discount Codes',
      description: 'Manage promotional codes and discounts',
      category: 'management',
      icon: Tags,
      isEnabled: true
    },
    {
      id: 'settings',
      name: 'System Settings',
      description: 'Configure system settings and preferences',
      category: 'settings',
      icon: Settings,
      isEnabled: true
    },
    {
      id: 'user_management',
      name: 'User Management',
      description: 'Manage user accounts and permissions',
      category: 'management',
      icon: UserCheck,
      isEnabled: true
    },
    {
      id: 'appearance',
      name: 'Appearance',
      description: 'Customize store appearance and branding',
      category: 'settings',
      icon: Eye,
      isEnabled: true
    },
    {
      id: 'layout_manager',
      name: 'Layout Manager',
      description: 'Manage dashboard layout and widgets',
      category: 'settings',
      icon: Settings,
      isEnabled: true
    }
  ]);

  // Permission categories
  const permissionCategories = [
    { id: 'management', name: 'Management', color: 'bg-blue-100 text-blue-800', icon: Building2 },
    { id: 'operations', name: 'Operations', color: 'bg-green-100 text-green-800', icon: ChefHat },
    { id: 'reports', name: 'Reports', color: 'bg-purple-100 text-purple-800', icon: BarChart3 },
    { id: 'settings', name: 'Settings', color: 'bg-orange-100 text-orange-800', icon: Settings }
  ];

  useEffect(() => {
    if (currentUser?.role !== 'master_admin') {
      return;
    }
    fetchUsers();
    fetchStores();
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      // Set default permissions for master admins (all permissions)
      const updatedUsersData = usersData.map(user => {
        if (user.role === 'master_admin') {
          return {
            ...user,
            permissions: availablePermissions.map(p => p.id) // All permissions for master admin
          };
        }
        return user;
      });
      
      setUsers(updatedUsersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const storesQuery = query(collection(db, 'stores'), orderBy('name'));
      const snapshot = await getDocs(storesQuery);
      const storesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Store[];
      setStores(storesData);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;
    
    try {
      const enabledPermissions = availablePermissions
        .filter(permission => permission.isEnabled)
        .map(permission => permission.id);
      
      await updateDoc(doc(db, 'users', selectedUser.id), {
        permissions: enabledPermissions
      });
      
      // Create notification for permission change
      await notifyPermissionChange(
        selectedUser.name,
        selectedUser.id,
        currentUser?.assignedStoreId
      );
      
      setShowRoleDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  const togglePermission = (permissionId: string) => {
    setAvailablePermissions(prev => 
      prev.map(permission => 
        permission.id === permissionId 
          ? { ...permission, isEnabled: !permission.isEnabled }
          : permission
      )
    );
  };

  const openRoleDialog = (user: User) => {
    // Don't allow editing master admin permissions
    if (user.role === 'master_admin') {
      alert('Master administrators have all permissions by default and cannot be modified.');
      return;
    }
    
    setSelectedUser(user);
    
    // Set current permissions
    const userPermissions = user.permissions || [];
    setAvailablePermissions(prev => 
      prev.map(permission => ({
        ...permission,
        isEnabled: userPermissions.includes(permission.id)
      }))
    );
    
    setShowRoleDialog(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'master_admin':
        return 'bg-purple-100 text-purple-800';
      case 'store_admin':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'master_admin':
        return 'Master Admin';
      case 'store_admin':
        return 'Store Admin';
      case 'employee':
        return 'Employee';
      default:
        return role;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStore = storeFilter === 'all' || user.assignedStoreId === storeFilter;
    
    return matchesSearch && matchesRole && matchesStore;
  });

  if (currentUser?.role !== 'master_admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="flex items-center justify-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-600">Only master administrators can access role management.</p>
          </div>
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
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Role Management</h1>
              <p className="text-lg text-gray-600">Manage user permissions and access control</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-[#800000] to-red-700 rounded-xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Permission Management</h2>
            <p className="text-gray-600">Configure user access and permissions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Users className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">All Roles</option>
                  <option value="master_admin">Master Admin</option>
                  <option value="store_admin">Store Admin</option>
                  <option value="employee">Employee</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Store className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
                <Select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">All Stores</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#800000] to-red-700 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">User Permissions</h2>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                {filteredUsers.length} users
              </span>
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.assignedStoreName || stores.find(s => s.id === user.assignedStoreId)?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.role === 'master_admin' ? 'All Permissions' : `${user.permissions?.length || 0} permissions`}
                          </div>
                          {user.role !== 'master_admin' && (
                            <div className="text-xs text-gray-500">
                              {user.permissions?.slice(0, 3).join(', ')}
                              {user.permissions && user.permissions.length > 3 && '...'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {user.role !== 'master_admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRoleDialog(user)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Role Permissions Dialog */}
        {showRoleDialog && selectedUser && (
          <div 
            className="fixed inset-0 z-[60] flex justify-center items-center p-2 sm:p-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-[#800000] to-red-700 p-6 text-white">
                <h2 className="text-2xl font-bold">Manage Permissions</h2>
                <p className="text-red-100 mt-1">
                  {selectedUser.name} - {getRoleLabel(selectedUser.role)}
                </p>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Permissions</h3>
                  <p className="text-sm text-gray-600">
                    Choose which modules and features this user can access. Only selected permissions will be visible in their sidebar.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {permissionCategories.map(category => {
                    const categoryPermissions = availablePermissions.filter(p => p.category === category.id);
                    const isExpanded = expandedCategory === category.id;
                    const Icon = category.icon;
                    
                    return (
                      <div key={category.id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedCategory(category.id)}
                          className={`w-full p-4 flex items-center justify-between transition-all duration-300 ease-in-out ${
                            isExpanded ? 'bg-gray-50 shadow-sm' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg transition-all duration-300 ${
                              isExpanded 
                                ? 'scale-110 shadow-md' 
                                : 'hover:scale-105'
                            } ${category.color.replace('text-', 'bg-').replace('bg-blue-100', 'bg-blue-100').replace('bg-green-100', 'bg-green-100').replace('bg-purple-100', 'bg-purple-100').replace('bg-orange-100', 'bg-orange-100')}`}>
                              <Icon className={`h-5 w-5 transition-all duration-300 ${
                                category.color.includes('blue') ? 'text-blue-600' : category.color.includes('green') ? 'text-green-600' : category.color.includes('purple') ? 'text-purple-600' : 'text-orange-600'
                              }`} />
                            </div>
                            <div>
                              <h4 className={`font-semibold transition-all duration-300 ${
                                isExpanded ? 'text-gray-900' : category.color
                              }`}>
                                {category.name}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {categoryPermissions.length} permissions
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full transition-all duration-300 ${
                              isExpanded ? 'bg-gray-200 text-gray-700' : category.color
                            }`}>
                              {categoryPermissions.filter(p => p.isEnabled).length} selected
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-all duration-300 ${
                              isExpanded ? 'rotate-180 scale-110' : 'hover:scale-110'
                            }`} />
                          </div>
                        </button>
                        
                        <div className={`transition-all duration-500 ease-in-out transform ${
                          isExpanded ? 'max-h-96 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95'
                        } overflow-hidden`}>
                          <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                              {categoryPermissions.map(permission => {
                                const PermissionIcon = permission.icon;
                                return (
                                  <div
                                    key={permission.id}
                                    className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                      permission.isEnabled
                                        ? 'border-red-300 bg-red-50 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => togglePermission(permission.id)}
                                    title={permission.description}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <PermissionIcon className={`h-4 w-4 flex-shrink-0 ${
                                          permission.isEnabled ? 'text-red-600' : 'text-gray-400'
                                        }`} />
                                        <div className="min-w-0 flex-1">
                                          <h5 className={`font-medium text-sm ${
                                            permission.isEnabled ? 'text-red-900' : 'text-gray-900'
                                          } leading-tight`}>
                                            {permission.name}
                                          </h5>
                                        </div>
                                      </div>
                                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 transition-all duration-200 ${
                                        permission.isEnabled
                                          ? 'border-red-600 bg-red-600 scale-110'
                                          : 'border-gray-300 hover:border-gray-400'
                                      }`}>
                                        {permission.isEnabled && (
                                          <Check className="h-2.5 w-2.5 text-white transition-all duration-200" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowRoleDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdatePermissions}
                    className="bg-gradient-to-r from-[#800000] to-red-700 hover:from-red-800 hover:to-red-900 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Permissions
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

export default RoleManagement; 