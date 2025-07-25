export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'master_admin' | 'store_admin' | 'employee';
  assignedStoreId?: string;
  password: string; // In real app, this would be hashed
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

// This will be our in-memory user database
// In a real app, this would be in Firebase/database
let USERS: User[] = [
  {
    id: 'user_001',
    name: 'Master Admin',
    email: 'admin@rightwingers.com',
    phone: '+1 (905) 555-0100',
    role: 'master_admin',
    password: 'admin123',
    isActive: true,
    createdAt: '2024-01-01',
    lastLogin: '2024-06-28'
  },
  {
    id: 'user_002',
    name: 'John Smith',
    email: 'hamilton.manager@rightwingers.com',
    phone: '+1 (905) 777-9464',
    role: 'store_admin',
    assignedStoreId: 'store_001',
    password: 'hamilton123',
    isActive: true,
    createdAt: '2024-01-15',
    lastLogin: '2024-06-27'
  },
  {
    id: 'user_003',
    name: 'Sarah Johnson',
    email: 'burlington.manager@rightwingers.com',
    phone: '+1 (905) 331-1944',
    role: 'store_admin',
    assignedStoreId: 'store_002',
    password: 'burlington123',
    isActive: true,
    createdAt: '2024-01-20',
    lastLogin: '2024-06-28'
  },
  {
    id: 'user_004',
    name: 'Mike Davis',
    email: 'stcatharines.manager@rightwingers.com',
    phone: '+1 (905) 397-9090',
    role: 'store_admin',
    assignedStoreId: 'store_003',
    password: 'stcatharines123',
    isActive: true,
    createdAt: '2024-02-01',
    lastLogin: '2024-06-26'
  },
  {
    id: 'user_005',
    name: 'Emma Wilson',
    email: 'oakville.manager@rightwingers.com',
    phone: '+1 (905) 337-9596',
    role: 'store_admin',
    assignedStoreId: 'store_004',
    password: 'oakville123',
    isActive: true,
    createdAt: '2024-02-10',
    lastLogin: '2024-06-28'
  }
];

// User management functions
export const getAllUsers = (): User[] => {
  return [...USERS];
};

export const getUserById = (id: string): User | undefined => {
  return USERS.find(user => user.id === id);
};

export const getUserByEmail = (email: string): User | undefined => {
  return USERS.find(user => user.email === email);
};

export const authenticateUser = (email: string, password: string): User | null => {
  const user = USERS.find(user => user.email === email && user.password === password && user.isActive);
  if (user) {
    // Update last login
    user.lastLogin = new Date().toISOString().split('T')[0];
    return user;
  }
  return null;
};

export const createUser = (userData: Omit<User, 'id' | 'createdAt' | 'isActive'>): User => {
  const newUser: User = {
    ...userData,
    id: `user_${Date.now()}`,
    isActive: true,
    createdAt: new Date().toISOString().split('T')[0]
  };
  
  USERS.push(newUser);
  return newUser;
};

export const updateUser = (id: string, updates: Partial<User>): User | null => {
  const userIndex = USERS.findIndex(user => user.id === id);
  if (userIndex === -1) return null;
  
  USERS[userIndex] = { ...USERS[userIndex], ...updates };
  return USERS[userIndex];
};

export const deleteUser = (id: string): boolean => {
  const userIndex = USERS.findIndex(user => user.id === id);
  if (userIndex === -1) return false;
  
  // Don't allow deleting master admin
  if (USERS[userIndex].role === 'master_admin') return false;
  
  USERS.splice(userIndex, 1);
  return true;
};

export const getUsersByStore = (storeId: string): User[] => {
  return USERS.filter(user => user.assignedStoreId === storeId);
};

export const getUsersByRole = (role: User['role']): User[] => {
  return USERS.filter(user => user.role === role);
}; 