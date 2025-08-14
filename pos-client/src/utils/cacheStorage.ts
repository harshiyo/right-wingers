import { Customer } from '../data/customers';

interface CacheEntry {
  data: Customer[];
  timestamp: number;
  storeId: string;
}

interface SearchCache {
  [key: string]: {
    results: Customer[];
    timestamp: number;
  };
}

const CUSTOMER_CACHE_KEY = 'pos_customer_cache';
const SEARCH_CACHE_KEY = 'pos_search_cache';
const CACHE_VERSION = '1.0';

// Add version to cache keys to handle cache invalidation on app updates
const getVersionedKey = (baseKey: string) => `${baseKey}_v${CACHE_VERSION}`;

export const cacheStorage = {
  // Save customer cache to localStorage
  saveCustomerCache: (cache: CacheEntry): void => {
    try {
      const key = getVersionedKey(CUSTOMER_CACHE_KEY);
      localStorage.setItem(key, JSON.stringify(cache));
      console.log('💾 Customer cache saved to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save customer cache to localStorage:', error);
    }
  },

  // Load customer cache from localStorage
  loadCustomerCache: (): CacheEntry | null => {
    try {
      const key = getVersionedKey(CUSTOMER_CACHE_KEY);
      const cached = localStorage.getItem(key);
      if (cached) {
        const cache = JSON.parse(cached) as CacheEntry;
        console.log('📦 Customer cache loaded from localStorage');
        return cache;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load customer cache from localStorage:', error);
    }
    return null;
  },

  // Save search cache to localStorage
  saveSearchCache: (searchCache: SearchCache): void => {
    try {
      const key = getVersionedKey(SEARCH_CACHE_KEY);
      localStorage.setItem(key, JSON.stringify(searchCache));
      console.log('💾 Search cache saved to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save search cache to localStorage:', error);
    }
  },

  // Load search cache from localStorage
  loadSearchCache: (): SearchCache => {
    try {
      const key = getVersionedKey(SEARCH_CACHE_KEY);
      const cached = localStorage.getItem(key);
      if (cached) {
        const searchCache = JSON.parse(cached) as SearchCache;
        console.log('📦 Search cache loaded from localStorage');
        return searchCache;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load search cache from localStorage:', error);
    }
    return {};
  },

  // Clear all cache data
  clearAll: (): void => {
    try {
      const customerKey = getVersionedKey(CUSTOMER_CACHE_KEY);
      const searchKey = getVersionedKey(SEARCH_CACHE_KEY);
      
      localStorage.removeItem(customerKey);
      localStorage.removeItem(searchKey);
      
      console.log('🗑️ All cache data cleared from localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to clear cache from localStorage:', error);
    }
  },

  // Get cache size information
  getCacheInfo: (): { customerCacheSize: number; searchCacheSize: number } => {
    try {
      const customerKey = getVersionedKey(CUSTOMER_CACHE_KEY);
      const searchKey = getVersionedKey(SEARCH_CACHE_KEY);
      
      const customerData = localStorage.getItem(customerKey);
      const searchData = localStorage.getItem(searchKey);
      
      return {
        customerCacheSize: customerData ? new Blob([customerData]).size : 0,
        searchCacheSize: searchData ? new Blob([searchData]).size : 0
      };
    } catch (error) {
      console.warn('⚠️ Failed to get cache info:', error);
      return { customerCacheSize: 0, searchCacheSize: 0 };
    }
  },

  // Clean up old cache versions
  cleanupOldVersions: (): void => {
    try {
      const keys = Object.keys(localStorage);
      const oldCacheKeys = keys.filter(key => 
        key.startsWith('pos_customer_cache_') || 
        key.startsWith('pos_search_cache_')
      );
      
      oldCacheKeys.forEach(key => {
        if (!key.includes(`_v${CACHE_VERSION}`)) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed old cache version: ${key}`);
        }
      });
    } catch (error) {
      console.warn('⚠️ Failed to cleanup old cache versions:', error);
    }
  }
};
