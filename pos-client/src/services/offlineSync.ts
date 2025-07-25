import { openDB, IDBPDatabase, DBSchema } from 'idb';

// Define the offline database schema
interface OfflineDB extends DBSchema {
  orders: {
    key: string;
    value: {
      id: string;
      storeId: string;
      customerId: string;
      items: any[];
      total: number;
      status: 'pending' | 'synced' | 'failed';
      timestamp: number;
      orderType: string;
      customerInfo: any;
      offline: boolean;
    };
    indexes: {
      storeId: string;
      status: 'pending' | 'synced' | 'failed';
      timestamp: number;
    };
  };
  customers: {
    key: string;
    value: {
      id: string;
      storeId: string;
      name: string;
      phone: string;
      email?: string;
      address?: string;
      status: 'pending' | 'synced' | 'failed';
      timestamp: number;
      offline: boolean;
    };
    indexes: {
      storeId: string;
      phone: string;
      status: 'pending' | 'synced' | 'failed';
    };
  };
  menu: {
    key: string;
    value: {
      id: string;
      storeId: string;
      category: string;
      name: string;
      price: number;
      description?: string;
      available: boolean;
      lastSync: number;
    };
    indexes: {
      storeId: string;
      category: string;
    };
  };
  toppings: {
    key: string;
    value: {
      id: string;
      name: string;
      price: number;
      category?: string;
      isVegetarian?: boolean;
      isVegan?: boolean;
      isGlutenFree?: boolean;
      isKeto?: boolean;
      lastSync: number;
    };
    indexes: {
      name: string;
      category: string;
    };
  };
  sauces: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      price?: number;
      isSpicy?: boolean;
      isVegan?: boolean;
      lastSync: number;
    };
    indexes: {
      name: string;
    };
  };
  categories: {
    key: string;
    value: {
      id: string;
      name: string;
      icon?: string;
      lastSync: number;
    };
    indexes: {
      name: string;
    };
  };
  combos: {
    key: string;
    value: {
      id: string;
      name: string;
      basePrice: number;
      imageUrl?: string;
      components: any[];
      lastSync: number;
    };
    indexes: {
      name: string;
    };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      type: 'order' | 'customer' | 'menu_update';
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: number;
      retryCount: number;
      storeId: string;
    };
    indexes: {
      type: 'order' | 'customer' | 'menu_update';
      timestamp: number;
      storeId: string;
    };
  };
}

class OfflineSyncService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private initialized = false;
  private _isOnline = navigator.onLine;
  private _isSyncing = false;
  private syncCallbacks: ((status: 'syncing' | 'synced' | 'error') => void)[] = [];

  constructor() {
    this.initDB();
    this.setupNetworkListeners();
  }

  private async initDB() {
    try {
      this.db = await openDB<OfflineDB>('rightwingers-pos', 1, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log('🔧 Upgrading IndexedDB schema...');
          
          // Create orders store
          if (!db.objectStoreNames.contains('orders')) {
            const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
            ordersStore.createIndex('storeId', 'storeId');
            ordersStore.createIndex('status', 'status');
            ordersStore.createIndex('timestamp', 'timestamp');
            console.log('✅ Created orders store');
          }

          // Create customers store
          if (!db.objectStoreNames.contains('customers')) {
            const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
            customersStore.createIndex('storeId', 'storeId');
            customersStore.createIndex('phone', 'phone');
            customersStore.createIndex('status', 'status');
            console.log('✅ Created customers store');
          }

          // Create menu store
          if (!db.objectStoreNames.contains('menu')) {
            const menuStore = db.createObjectStore('menu', { keyPath: 'id' });
            menuStore.createIndex('storeId', 'storeId');
            menuStore.createIndex('category', 'category');
            console.log('✅ Created menu store');
          }

          // Create toppings store
          if (!db.objectStoreNames.contains('toppings')) {
            const toppingsStore = db.createObjectStore('toppings', { keyPath: 'id' });
            toppingsStore.createIndex('name', 'name');
            toppingsStore.createIndex('category', 'category');
            console.log('✅ Created toppings store');
          }

          // Create sauces store
          if (!db.objectStoreNames.contains('sauces')) {
            const saucesStore = db.createObjectStore('sauces', { keyPath: 'id' });
            saucesStore.createIndex('name', 'name');
            console.log('✅ Created sauces store');
          }

          // Create categories store
          if (!db.objectStoreNames.contains('categories')) {
            const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
            categoriesStore.createIndex('name', 'name');
            console.log('✅ Created categories store');
          }

          // Create combos store
          if (!db.objectStoreNames.contains('combos')) {
            const combosStore = db.createObjectStore('combos', { keyPath: 'id' });
            combosStore.createIndex('name', 'name');
            console.log('✅ Created combos store');
          }

          // Create sync queue store
          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            syncStore.createIndex('type', 'type');
            syncStore.createIndex('timestamp', 'timestamp');
            syncStore.createIndex('storeId', 'storeId');
            console.log('✅ Created sync_queue store');
          }

          console.log('🎉 IndexedDB schema upgrade complete');
        },
      });

      this.initialized = true;
      console.log('💾 OfflineSync database initialized');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this._isOnline = true;
      console.log('🌐 Back online - starting sync...');
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this._isOnline = false;
      console.log('📴 Gone offline - switching to local storage');
    });
  }

  private startPeriodicSync() {
    // Try to sync every 30 seconds when online
    setInterval(() => {
      if (this._isOnline && !this._isSyncing) {
        this.syncPendingData();
      }
    }, 30000);
  }

  // Cache menu data for offline use
  async cacheMenuData(storeId: string, menuItems: any[]) {
    if (!this.db || !this.initialized) {
      console.warn('Database not ready for caching menu data');
      return;
    }

    try {
      const tx = this.db.transaction('menu', 'readwrite');
      
      for (const item of menuItems) {
        await tx.store.put({
          ...item,
          storeId,
          lastSync: Date.now(),
        });
      }
      
      await tx.done;
      console.log(`📦 Cached ${menuItems.length} menu items for store ${storeId}`);
    } catch (error) {
      console.error('Failed to cache menu data:', error);
    }
  }

  // Cache toppings data
  async cacheToppingsData(toppings: any[]) {
    if (!this.db || !this.initialized) {
      console.warn('Database not ready for caching toppings');
      return;
    }

    try {
      const tx = this.db.transaction('toppings', 'readwrite');
      
      for (const topping of toppings) {
        await tx.store.put({
          ...topping,
          lastSync: Date.now(),
        });
      }
      
      await tx.done;
      console.log(`🧄 Cached ${toppings.length} toppings`);
    } catch (error) {
      console.error('Failed to cache toppings:', error);
    }
  }

  // Cache sauces data
  async cacheSaucesData(sauces: any[]) {
    if (!this.db || !this.initialized) {
      console.warn('Database not ready for caching sauces');
      return;
    }

    try {
      const tx = this.db.transaction('sauces', 'readwrite');
      
      for (const sauce of sauces) {
        await tx.store.put({
          ...sauce,
          lastSync: Date.now(),
        });
      }
      
      await tx.done;
      console.log(`🌶️ Cached ${sauces.length} sauces`);
    } catch (error) {
      console.error('Failed to cache sauces:', error);
    }
  }

  // Cache categories data
  async cacheCategoriesData(categories: any[]) {
    if (!this.db || !this.initialized) {
      console.warn('Database not ready for caching categories');
      return;
    }

    try {
      const tx = this.db.transaction('categories', 'readwrite');
      
      for (const category of categories) {
        await tx.store.put({
          ...category,
          lastSync: Date.now(),
        });
      }
      
      await tx.done;
      console.log(`📂 Cached ${categories.length} categories`);
    } catch (error) {
      console.error('Failed to cache categories:', error);
    }
  }

  // Cache combos data
  async cacheCombosData(combos: any[]) {
    if (!this.db || !this.initialized) {
      console.warn('Database not ready for caching combos');
      return;
    }

    try {
      const tx = this.db.transaction('combos', 'readwrite');
      
      for (const combo of combos) {
        await tx.store.put({
          ...combo,
          lastSync: Date.now(),
        });
      }
      
      await tx.done;
      console.log(`🍽️ Cached ${combos.length} combos`);
    } catch (error) {
      console.error('Failed to cache combos:', error);
    }
  }

  // Get cached menu data
  async getCachedMenu(storeId: string): Promise<any[]> {
    if (!this.db) return [];
    
    try {
      return await this.db.getAllFromIndex('menu', 'storeId', storeId);
    } catch (error) {
      console.error('Failed to get cached menu:', error);
      return [];
    }
  }

  async getCachedToppings(): Promise<any[]> {
    if (!this.db) return [];
    
    try {
      return await this.db.getAll('toppings');
    } catch (error) {
      console.error('Failed to get cached toppings:', error);
      return [];
    }
  }

  async getCachedSauces(): Promise<any[]> {
    if (!this.db) return [];
    
    try {
      return await this.db.getAll('sauces');
    } catch (error) {
      console.error('Failed to get cached sauces:', error);
      return [];
    }
  }

  async getCachedCategories(): Promise<any[]> {
    if (!this.db) return [];
    
    try {
      return await this.db.getAll('categories');
    } catch (error) {
      console.error('Failed to get cached categories:', error);
      return [];
    }
  }

  async getCachedCombos(): Promise<any[]> {
    if (!this.db) return [];
    
    try {
      return await this.db.getAll('combos');
    } catch (error) {
      console.error('Failed to get cached combos:', error);
      return [];
    }
  }

  // Save order offline
  async saveOrderOffline(order: any, storeId: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const offlineOrder = {
      ...order,
      id: order.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      storeId,
      status: 'pending' as const,
      timestamp: Date.now(),
      offline: true
    };

    // Save to orders store
    await this.db.add('orders', offlineOrder);

    // Add to sync queue
    await this.addToSyncQueue('order', 'create', offlineOrder, storeId);

    console.log(`💾 Order saved offline: ${offlineOrder.id}`);
    return offlineOrder.id;
  }

  // Save customer offline
  async saveCustomerOffline(customer: any, storeId: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const offlineCustomer = {
      ...customer,
      id: customer.id || `offline_customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      storeId,
      status: 'pending' as const,
      timestamp: Date.now(),
      offline: true
    };

    await this.db.add('customers', offlineCustomer);
    await this.addToSyncQueue('customer', 'create', offlineCustomer, storeId);

    console.log(`💾 Customer saved offline: ${offlineCustomer.id}`);
    return offlineCustomer.id;
  }

  // Get offline orders for a store
  async getOfflineOrders(storeId: string): Promise<any[]> {
    if (!this.db) return [];
    
    try {
      return await this.db.getAllFromIndex('orders', 'storeId', storeId);
    } catch (error) {
      console.error('Failed to get offline orders:', error);
      return [];
    }
  }

  // Get offline customers for a store
  async getOfflineCustomers(storeId: string): Promise<any[]> {
    if (!this.db) return [];
    
    try {
      return await this.db.getAllFromIndex('customers', 'storeId', storeId);
    } catch (error) {
      console.error('Failed to get offline customers:', error);
      return [];
    }
  }

  // Add item to sync queue
  private async addToSyncQueue(type: 'order' | 'customer' | 'menu_update', action: 'create' | 'update' | 'delete', data: any, storeId: string) {
    if (!this.db) return;

    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      storeId
    };

    await this.db.add('sync_queue', syncItem);
  }

  // Sync pending data when back online
  async syncPendingData() {
    if (!this._isOnline || this._isSyncing || !this.db) return;

    this._isSyncing = true;
    this.notifyStatusChange('syncing');

    try {
      const pendingItems = await this.db.getAll('sync_queue');
      console.log(`🔄 Starting sync: ${pendingItems.length} items pending`);

      let successCount = 0;
      let errorCount = 0;

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          await this.db.delete('sync_queue', item.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          
          // Increment retry count
          item.retryCount++;
          if (item.retryCount < 5) {
            await this.db.put('sync_queue', item);
          } else {
            // Remove after too many retries
            await this.db.delete('sync_queue', item.id);
            console.warn(`Giving up on item ${item.id} after 5 retries`);
          }
          errorCount++;
        }
      }

      console.log(`🔄 Sync completed: ${successCount} success, ${errorCount} errors`);
      this.notifyStatusChange('synced');

    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyStatusChange('error');
    } finally {
      this._isSyncing = false;
    }
  }

  // Sync individual item
  private async syncItem(item: any) {
    const { type, action, data } = item;

    switch (type) {
      case 'order':
        if (action === 'create') {
          await this.syncOrderToFirebase(data);
        }
        break;
      case 'customer':
        if (action === 'create') {
          await this.syncCustomerToFirebase(data);
        }
        break;
      default:
        console.warn(`Unknown sync type: ${type}`);
    }
  }

  // Sync order to Firebase
  private async syncOrderToFirebase(order: any) {
    // Import Firebase functions
    const { collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    // Remove offline-specific fields and sanitize data
    const { offline, status, ...firebaseOrder } = order;

    // Sanitize customerInfo to remove undefined values
    if (firebaseOrder.customerInfo) {
      const sanitizedCustomerInfo: any = {};
      Object.keys(firebaseOrder.customerInfo).forEach(key => {
        if (firebaseOrder.customerInfo[key] !== undefined && firebaseOrder.customerInfo[key] !== null) {
          sanitizedCustomerInfo[key] = firebaseOrder.customerInfo[key];
        }
      });
      firebaseOrder.customerInfo = sanitizedCustomerInfo;
    }

    // Ensure required fields have default values
    const sanitizedOrder = {
      ...firebaseOrder,
      customerInfo: {
        name: firebaseOrder.customerInfo?.name || 'Guest',
        phone: firebaseOrder.customerInfo?.phone || '',
        ...firebaseOrder.customerInfo
      },
      timestamp: firebaseOrder.timestamp || Date.now(),
      total: firebaseOrder.total || 0,
      items: firebaseOrder.items || [],
      orderType: firebaseOrder.orderType || 'Pickup'
    };

    // Add to Firebase
    const docRef = await addDoc(collection(db, 'orders'), sanitizedOrder);
    
    // Update local order status
    if (this.db) {
      await this.db.put('orders', {
        ...order,
        status: 'synced' as const,
        firebaseId: docRef.id
      });
    }

    console.log(`✅ Order synced to Firebase: ${order.id} → ${docRef.id}`);
  }

  // Sync customer to Firebase
  private async syncCustomerToFirebase(customer: any) {
    // Import Firebase functions
    const { collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    // Remove offline-specific fields
    const { offline, status, ...firebaseCustomer } = customer;

    // Add to Firebase
    const docRef = await addDoc(collection(db, 'customers'), firebaseCustomer);
    
    // Update local customer status
    if (this.db) {
      await this.db.put('customers', {
        ...customer,
        status: 'synced' as const,
        firebaseId: docRef.id
      });
    }

    console.log(`✅ Customer synced to Firebase: ${customer.id} → ${docRef.id}`);
  }

  get isOffline(): boolean {
    return !this._isOnline;
  }

  get isSyncing(): boolean {
    return this._isSyncing;
  }

  // Get sync statistics
  getSyncStats(): {
    pendingItems: number;
    totalItems: number;
    lastSyncTime?: number;
    hasErrors: boolean;
  } {
    // Return simple stats for now
    return {
      pendingItems: 0,
      totalItems: 0,
      lastSyncTime: Date.now(),
      hasErrors: false,
    };
  }

  // Sync pending items manually
  async syncPendingItems(): Promise<void> {
    if (this._isSyncing || this.isOffline) {
      return;
    }

    try {
      this._isSyncing = true;
      this.notifyStatusChange('syncing');
      
      await this.syncPendingData();
      
      this.notifyStatusChange('synced');
    } catch (error) {
      console.error('Manual sync failed:', error);
      this.notifyStatusChange('error');
    } finally {
      this._isSyncing = false;
    }
  }

  // Subscribe to sync status changes
  onSyncStatusChange(callback: (status: 'syncing' | 'synced' | 'error') => void) {
    this.syncCallbacks.push(callback);
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStatusChange(status: 'syncing' | 'synced' | 'error') {
    this.syncCallbacks.forEach(callback => callback(status));
  }

  // Clear all offline data (for testing or reset)
  async clearOfflineData() {
    if (!this.db) return;

    const tx = this.db.transaction(['orders', 'customers', 'menu', 'toppings', 'sauces', 'categories', 'combos', 'sync_queue'], 'readwrite');
    await Promise.all([
      tx.objectStore('orders').clear(),
      tx.objectStore('customers').clear(),
      tx.objectStore('menu').clear(),
      tx.objectStore('toppings').clear(),
      tx.objectStore('sauces').clear(),
      tx.objectStore('categories').clear(),
      tx.objectStore('combos').clear(),
      tx.objectStore('sync_queue').clear(),
    ]);

    console.log('🗑️ All offline data cleared');
  }
}

// Export singleton instance
export const offlineSync = new OfflineSyncService(); 