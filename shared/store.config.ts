// Store and User Management Configuration
export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'master_admin' | 'store_admin' | 'employee';
  assignedStoreId?: string; // Only for store_admin and employee
  permissions: Permission[];
  isActive: boolean;
}

export interface Permission {
  resource: 'orders' | 'menu' | 'customers' | 'analytics' | 'settings' | 'users';
  actions: ('read' | 'write' | 'delete')[];
  storeIds?: string[]; // If undefined, applies to all stores (master_admin only)
}

// Store definitions for the franchise
export const stores: Store[] = [
  {
    id: 'store_001',
    name: 'Right Wingers - Hamilton',
    address: '1846 Main St W',
    city: 'Hamilton',
    province: 'ON',
    postalCode: 'L8S 4P7',
    phone: '(905) 777-9464',
    hours: {
      monday: '3:30pm - 8:30pm',
      tuesday: '3:30pm - 10:30pm',
      wednesday: '3:30pm - 10:30pm',
      thursday: '3:30pm - 10:30pm',
      friday: '3:00pm - 11:30pm',
      saturday: '3:00pm - 10:30pm',
      sunday: '1:00pm - 8:30pm'
    },
    isActive: true
  },
  {
    id: 'store_002',
    name: 'Right Wingers - Burlington',
    address: '2184 Mountain Grove Ave',
    city: 'Burlington',
    province: 'ON',
    postalCode: 'L7P 2J3',
    phone: '(905) 331-1944',
    hours: {
      monday: '11:00am - 10:00pm',
      tuesday: '11:00am - 11:00pm',
      wednesday: '11:00am - 11:00pm',
      thursday: '11:00am - 11:00pm',
      friday: '11:00am - 12:00am',
      saturday: '11:00am - 12:00am',
      sunday: '11:00am - 11:00pm'
    },
    isActive: true
  },
  {
    id: 'store_003',
    name: 'Right Wingers - St. Catharines',
    address: '486 Grantham Ave',
    city: 'St. Catharines',
    province: 'ON',
    postalCode: 'L2M 6W2',
    phone: '(905) 397-9090',
    hours: {
      monday: '11:00am - 9:00pm',
      tuesday: '11:00am - 10:00pm',
      wednesday: '11:00am - 10:00pm',
      thursday: '11:00am - 10:00pm',
      friday: '11:00am - 11:00pm',
      saturday: '11:00am - 11:00pm',
      sunday: '12:00pm - 10:00pm'
    },
    isActive: true
  },
  {
    id: 'store_004',
    name: 'Right Wingers - Oakville',
    address: '601 Ford Dr',
    city: 'Oakville',
    province: 'ON',
    postalCode: 'L6J 7Z6',
    phone: '(905) 337-9596',
    hours: {
      monday: '11:00am - 10:00pm',
      tuesday: '11:00am - 11:00pm',
      wednesday: '11:00am - 11:00pm',
      thursday: '11:00am - 11:00pm',
      friday: '11:00am - 12:00am',
      saturday: '11:00am - 12:00am',
      sunday: '12:00pm - 11:00pm'
    },
    isActive: true
  }
];

// User roles and permissions
export const DEFAULT_PERMISSIONS: Record<User['role'], Permission[]> = {
  master_admin: [
    {
      resource: 'orders',
      actions: ['read', 'write', 'delete'],
      // No storeIds = access to all stores
    },
    {
      resource: 'menu',
      actions: ['read', 'write', 'delete'],
    },
    {
      resource: 'customers',
      actions: ['read', 'write', 'delete'],
    },
    {
      resource: 'analytics',
      actions: ['read'],
    },
    {
      resource: 'settings',
      actions: ['read', 'write'],
    },
    {
      resource: 'users',
      actions: ['read', 'write', 'delete'],
    }
  ],
  store_admin: [
    {
      resource: 'orders',
      actions: ['read', 'write'],
      // storeIds will be set based on assignedStoreId
    },
    {
      resource: 'menu',
      actions: ['read', 'write'],
    },
    {
      resource: 'customers',
      actions: ['read', 'write'],
    },
    {
      resource: 'analytics',
      actions: ['read'],
    },
    {
      resource: 'settings',
      actions: ['read'],
    }
  ],
  employee: [
    {
      resource: 'orders',
      actions: ['read', 'write'],
    },
    {
      resource: 'menu',
      actions: ['read'],
    },
    {
      resource: 'customers',
      actions: ['read', 'write'],
    }
  ]
};

// Sample users for testing
export const SAMPLE_USERS: User[] = [
  {
    id: 'user_001',
    email: 'admin@rightwingers.com',
    name: 'Master Admin',
    role: 'master_admin',
    permissions: DEFAULT_PERMISSIONS.master_admin,
    isActive: true
  },
  {
    id: 'user_002',
    email: 'downtown.manager@rightwingers.com',
    name: 'John Smith',
    role: 'store_admin',
    assignedStoreId: 'store_001',
    permissions: DEFAULT_PERMISSIONS.store_admin.map(p => ({
      ...p,
      storeIds: ['store_001']
    })),
    isActive: true
  },
  {
    id: 'user_003',
    email: 'westside.manager@rightwingers.com',
    name: 'Sarah Johnson',
    role: 'store_admin',
    assignedStoreId: 'store_002',
    permissions: DEFAULT_PERMISSIONS.store_admin.map(p => ({
      ...p,
      storeIds: ['store_002']
    })),
    isActive: true
  },
  {
    id: 'user_004',
    email: 'university.manager@rightwingers.com',
    name: 'Mike Davis',
    role: 'store_admin',
    assignedStoreId: 'store_003',
    permissions: DEFAULT_PERMISSIONS.store_admin.map(p => ({
      ...p,
      storeIds: ['store_003']
    })),
    isActive: true
  },
  {
    id: 'user_005',
    email: 'lakeside.manager@rightwingers.com',
    name: 'Emma Wilson',
    role: 'store_admin',
    assignedStoreId: 'store_004',
    permissions: DEFAULT_PERMISSIONS.store_admin.map(p => ({
      ...p,
      storeIds: ['store_004']
    })),
    isActive: true
  }
];

// Utility functions
export const getStoreById = (storeId: string): Store | undefined => {
  return stores.find(store => store.id === storeId);
};

export const getActiveStores = (): Store[] => {
  return stores.filter(store => store.isActive);
};

export const getUserAccessibleStores = (user: User): Store[] => {
  if (user.role === 'master_admin') {
    return getActiveStores();
  }
  
  if (user.assignedStoreId) {
    const store = getStoreById(user.assignedStoreId);
    return store ? [store] : [];
  }
  
  return [];
};

export const hasPermission = (
  user: User, 
  resource: Permission['resource'], 
  action: Permission['actions'][0],
  storeId?: string
): boolean => {
  const permission = user.permissions.find(p => p.resource === resource);
  if (!permission || !permission.actions.includes(action)) {
    return false;
  }
  
  // Master admin has access to all stores
  if (user.role === 'master_admin') {
    return true;
  }
  
  // For store-specific permissions, check if user has access to the store
  if (storeId && permission.storeIds) {
    return permission.storeIds.includes(storeId);
  }
  
  return true;
}; 