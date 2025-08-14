import { useState, useEffect, useCallback, useRef } from 'react';
import { Customer, getAllCustomersFromFirebase } from '../data/customers';
import { cacheStorage } from '../utils/cacheStorage';

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

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SEARCH_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of search cache entries

export const useCustomerCache = (storeId: string) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  const cacheRef = useRef<CacheEntry | null>(null);
  const searchCacheRef = useRef<SearchCache>({});
  const fetchPromiseRef = useRef<Promise<Customer[]> | null>(null);

  // Check if cache is valid
  const isCacheValid = useCallback((cache: CacheEntry | null): boolean => {
    if (!cache) return false;
    
    const now = Date.now();
    const isExpired = now - cache.timestamp > CACHE_DURATION;
    const isWrongStore = cache.storeId !== storeId;
    
    return !isExpired && !isWrongStore;
  }, [storeId]);

  // Initialize cache from localStorage on mount
  useEffect(() => {
    // Clean up old cache versions
    cacheStorage.cleanupOldVersions();
    
    // Load customer cache from localStorage
    const savedCache = cacheStorage.loadCustomerCache();
    if (savedCache && isCacheValid(savedCache)) {
      cacheRef.current = savedCache;
      setCustomers(savedCache.data);
      setLastFetch(savedCache.timestamp);
      console.log('📦 Restored customer cache from localStorage');
    }
    
    // Load search cache from localStorage
    const savedSearchCache = cacheStorage.loadSearchCache();
    searchCacheRef.current = savedSearchCache;
  }, [isCacheValid]);

  // Get cached customers
  const getCachedCustomers = useCallback((): Customer[] => {
    if (isCacheValid(cacheRef.current)) {
      return cacheRef.current!.data;
    }
    return [];
  }, [isCacheValid]);

  // Fetch customers from Firebase (with deduplication)
  const fetchCustomers = useCallback(async (): Promise<Customer[]> => {
    // If there's already a fetch in progress, return that promise
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    // Check cache first
    if (isCacheValid(cacheRef.current)) {
      console.log('📦 Using cached customers');
      return cacheRef.current!.data;
    }

    console.log('🔄 Fetching customers from Firebase...');
    setIsLoading(true);
    setError(null);

    try {
      const fetchPromise = getAllCustomersFromFirebase(storeId);
      fetchPromiseRef.current = fetchPromise;
      
      const data = await fetchPromise;
      
      // Update cache
      const newCache = {
        data,
        timestamp: Date.now(),
        storeId
      };
      cacheRef.current = newCache;
      
      // Save to localStorage
      cacheStorage.saveCustomerCache(newCache);
      
      setCustomers(data);
      setLastFetch(Date.now());
      
      console.log(`✅ Fetched ${data.length} customers`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch customers';
      setError(errorMessage);
      console.error('❌ Error fetching customers:', err);
      throw err;
    } finally {
      setIsLoading(false);
      fetchPromiseRef.current = null;
    }
  }, [storeId, isCacheValid]);

  // Search customers with caching
  const searchCustomers = useCallback(async (query: string): Promise<Customer[]> => {
    if (!query || query.length < 3) return [];

    const cleanedQuery = query.toLowerCase().trim();
    const searchKey = `${storeId}:${cleanedQuery}`;
    
    // Check search cache first
    const searchCache = searchCacheRef.current[searchKey];
    if (searchCache && Date.now() - searchCache.timestamp < SEARCH_CACHE_DURATION) {
      console.log('🔍 Using cached search results');
      return searchCache.results;
    }

    // Only fetch from Firebase if query is 6+ digits (phone number) or 3+ characters (name)
    const cleanedDigits = cleanedQuery.replace(/\D/g, '');
    const isPhoneSearch = cleanedDigits.length >= 6;
    const isNameSearch = cleanedQuery.length >= 3 && cleanedDigits.length === 0;
    
    let allCustomers: Customer[];
    
    if (isPhoneSearch || isNameSearch) {
      // Fetch from Firebase only when we have enough digits/characters
      allCustomers = await fetchCustomers();
    } else {
      // For partial searches (3-5 digits), only search in existing cache
      allCustomers = getCachedCustomers();
      
      if (allCustomers.length === 0) {
        // If no cached data, don't search - return empty results
        console.log('🔍 Partial search with no cache - returning empty results');
        return [];
      }
    }
    
    // Perform search
    const results = allCustomers.filter((customer) => {
      // Filter by store if provided
      if (storeId && customer.storeId !== storeId) return false;
      
      const customerPhone = customer.phone.replace(/\D/g, '');
      const customerName = customer.name.toLowerCase();
      
      // Phone number matches
      if (customerPhone.includes(cleanedQuery.replace(/\D/g, ''))) return true;
      
      // Last 4 digits match
      if (cleanedQuery.replace(/\D/g, '').length >= 4 && 
          customerPhone.endsWith(cleanedQuery.replace(/\D/g, ''))) return true;
      
      // Area code match
      if (cleanedQuery.replace(/\D/g, '').length >= 3 && 
          customerPhone.startsWith(cleanedQuery.replace(/\D/g, ''))) return true;
      
      // Name match
      if (customerName.includes(cleanedQuery)) return true;
      
      return false;
    });

    // Cache search results
    searchCacheRef.current[searchKey] = {
      results,
      timestamp: Date.now()
    };

    // Save search cache to localStorage
    cacheStorage.saveSearchCache(searchCacheRef.current);

    // Clean up old search cache entries
    const cacheKeys = Object.keys(searchCacheRef.current);
    if (cacheKeys.length > MAX_CACHE_SIZE) {
      const sortedKeys = cacheKeys.sort((a, b) => 
        searchCacheRef.current[b].timestamp - searchCacheRef.current[a].timestamp
      );
      
      // Remove oldest entries
      const keysToRemove = sortedKeys.slice(MAX_CACHE_SIZE);
      keysToRemove.forEach(key => delete searchCacheRef.current[key]);
      
      // Save updated cache
      cacheStorage.saveSearchCache(searchCacheRef.current);
    }

    console.log(`🔍 Search "${query}" returned ${results.length} results`);
    return results;
  }, [storeId, fetchCustomers]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    cacheRef.current = null;
    searchCacheRef.current = {};
    setLastFetch(0);
    cacheStorage.clearAll();
    console.log('🗑️ Customer cache invalidated');
  }, []);

  // Add customer to cache
  const addCustomerToCache = useCallback((customer: Customer) => {
    setCustomers(prev => {
      const existingIndex = prev.findIndex(c => c.id === customer.id);
      if (existingIndex >= 0) {
        // Update existing customer
        const updated = [...prev];
        updated[existingIndex] = customer;
        return updated;
      } else {
        // Add new customer
        return [...prev, customer];
      }
    });

    // Update cache
    if (cacheRef.current) {
      const existingIndex = cacheRef.current.data.findIndex(c => c.id === customer.id);
      if (existingIndex >= 0) {
        cacheRef.current.data[existingIndex] = customer;
      } else {
        cacheRef.current.data.push(customer);
      }
    }

    // Invalidate search cache since we added/updated a customer
    searchCacheRef.current = {};
  }, []);

  // Remove customer from cache
  const removeCustomerFromCache = useCallback((customerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    
    if (cacheRef.current) {
      cacheRef.current.data = cacheRef.current.data.filter(c => c.id !== customerId);
    }
    
    // Invalidate search cache
    searchCacheRef.current = {};
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const searchCacheSize = Object.keys(searchCacheRef.current).length;
    const hasValidCache = isCacheValid(cacheRef.current);
    const cacheAge = cacheRef.current ? Date.now() - cacheRef.current.timestamp : 0;
    const cacheInfo = cacheStorage.getCacheInfo();
    
    return {
      hasValidCache,
      cacheAge: Math.round(cacheAge / 1000), // in seconds
      searchCacheSize,
      totalCustomers: customers.length,
      lastFetch: lastFetch ? Math.round((Date.now() - lastFetch) / 1000) : null, // in seconds
      customerCacheSizeKB: Math.round(cacheInfo.customerCacheSize / 1024),
      searchCacheSizeKB: Math.round(cacheInfo.searchCacheSize / 1024)
    };
  }, [customers.length, lastFetch, isCacheValid]);

  // Preload customers on mount
  useEffect(() => {
    if (storeId) {
      fetchCustomers().catch(console.error);
    }
  }, [storeId, fetchCustomers]);

  return {
    customers,
    isLoading,
    error,
    searchCustomers,
    fetchCustomers,
    invalidateCache,
    addCustomerToCache,
    removeCustomerFromCache,
    getCacheStats,
    getCachedCustomers
  };
};
