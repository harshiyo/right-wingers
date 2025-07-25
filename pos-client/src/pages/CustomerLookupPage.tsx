import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCustomers, Customer, saveCustomerToFirebase } from '../data/customers';
import { Button } from '../components/ui/Button';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Numpad } from '../components/ui/Numpad';
import { SearchResults } from '../components/ui/SearchResults';
import { TopBar } from '../components/layout/TopBar';
import { Search, Phone, MapPin, Calendar, ShoppingBag, Edit, UserPlus, Sparkles, Users, Clock, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

// Lazy load the CustomerFormDialog to improve initial load time
const CustomerFormDialog = React.lazy(() => import('../components/CustomerFormDialog').then(module => ({ default: module.CustomerFormDialog })));

const CustomerLookupPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1); // For keyboard navigation
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { currentStore } = useStore();

  // Auto-focus the phone input when page loads and keep it focused
  useEffect(() => {
    const focusInput = () => {
      if (phoneInputRef.current) {
        phoneInputRef.current.focus();
      }
    };

    focusInput();
    
    // Keep input focused when clicking anywhere on the page
    const handlePageClick = (e: MouseEvent) => {
      // Don't refocus if clicking on buttons or interactive elements, or if dialog is open
      const target = e.target as HTMLElement;
      if (!showCreateDialog && !target.closest('button') && !target.closest('a') && !target.closest('input[type="datetime-local"]')) {
        setTimeout(focusInput, 0);
      }
    };

    document.addEventListener('click', handlePageClick);
    
    return () => {
      document.removeEventListener('click', handlePageClick);
    };
  }, [showCreateDialog]);

  // Memoized search function to prevent recreation on every render
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      // Use Firebase-integrated search function
      const results = await searchCustomers(query, currentStore?.id);
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentStore?.id]);

  // Optimized debounced search with cleanup
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 250); // Reduced from 300ms for better responsiveness

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Auto-select first customer when search results change and there's an exact phone match
  useEffect(() => {
    if (searchResults.length > 0) {
      // Check if the search query is a phone number (contains only digits, spaces, dashes, parentheses)
      const cleanQuery = searchQuery.replace(/[\s\-\(\)]/g, '');
      const isPhoneQuery = /^\d+$/.test(cleanQuery) && cleanQuery.length >= 10;
      
      if (isPhoneQuery) {
        // Check for exact phone match
        const exactMatch = searchResults.find(customer => {
          const cleanCustomerPhone = customer.phone.replace(/\D/g, '');
          return cleanCustomerPhone === cleanQuery || cleanCustomerPhone.endsWith(cleanQuery);
        });
        
        if (exactMatch) {
          const exactIndex = searchResults.findIndex(customer => customer.id === exactMatch.id);
          setSelectedIndex(exactIndex);
        } else {
          setSelectedIndex(0); // Select first result if no exact match
        }
      } else {
        setSelectedIndex(0); // Select first result for name searches
      }
    } else {
      setSelectedIndex(-1);
    }
  }, [searchResults, searchQuery]);

  // Memoized formatters to prevent recreation
  const formatPhoneDisplay = useCallback((phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }, []);

  const formatLastOrderDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  // Memoized handlers
  const handleSelectCustomer = useCallback((customer: Customer) => {
    navigate('/order', { 
      state: { 
        customer: customer, 
        phone: customer.phone 
      } 
    });
  }, [navigate]);

  const handleCreateCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'orderCount' | 'lastOrderDate' | 'storeId'>) => {
    try {
      const newCustomerData = {
        ...customerData,
        orderCount: 0,
        lastOrderDate: new Date().toISOString().split('T')[0],
        storeId: currentStore?.id || 'store_001', // Default to first store if no current store
      };
      
      // Save to Firebase first
      const savedCustomer = await saveCustomerToFirebase(newCustomerData);
      
      console.log('✅ New customer saved:', savedCustomer);
      
      // Navigate to order page with the saved customer
      navigate('/order', { 
        state: { 
          customer: savedCustomer, 
          phone: savedCustomer.phone 
        } 
      });
    } catch (error) {
      console.error('❌ Failed to save customer:', error);
      
      // Fallback: create customer in memory if Firebase fails
      const fallbackCustomer: Customer = {
        id: Date.now().toString(),
        ...customerData,
        orderCount: 0,
        lastOrderDate: new Date().toISOString().split('T')[0],
        storeId: currentStore?.id || 'store_001',
      };
      
      // Show error to user but still proceed
      alert('Warning: Could not save customer to database. Customer will be created temporarily for this order.');
      
      navigate('/order', { 
        state: { 
          customer: fallbackCustomer, 
          phone: fallbackCustomer.phone 
        } 
      });
    }
  }, [navigate, currentStore?.id]);

  // Numpad handlers
  const handleNumpadNumber = useCallback((number: string) => {
    setSearchQuery(prev => prev + number);
  }, []);

  const handleNumpadBackspace = useCallback(() => {
    setSearchQuery(prev => prev.slice(0, -1));
  }, []);

  const handleNumpadClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (searchResults.length > 0) {
            setSelectedIndex(prev => 
              prev < searchResults.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (searchResults.length > 0) {
            setSelectedIndex(prev => 
              prev > 0 ? prev - 1 : searchResults.length - 1
            );
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults.length > 0 && selectedIndex >= 0 && selectedIndex < searchResults.length) {
            handleSelectCustomer(searchResults[selectedIndex]);
          } else if (hasSearched && !isSearching && searchResults.length === 0 && searchQuery.length >= 3) {
            // No customers found but we have a search query - open create dialog
            setShowCreateDialog(true);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, selectedIndex, hasSearched, isSearching, searchQuery.length, handleSelectCustomer]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-orange-50">
      <TopBar 
        cartItemsCount={0}
        cartTotal={0}
        customerInfo={undefined}
        orderType="Setup"
        currentStep="customer"
        onQuickAddClick={() => {}}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto py-4 lg:py-8 px-3 lg:px-4">
          {/* Header */}

          {/* Enhanced Search Section */}
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl border border-gray-100 p-4 lg:p-8 mb-4 lg:mb-8">
            <div className="relative">
              <PhoneInput
                ref={phoneInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by phone number or name..."
                className="pl-4 lg:pl-6 pr-12 lg:pr-16 py-3 lg:py-4 w-full text-base lg:text-lg border-2 border-gray-200 rounded-xl lg:rounded-2xl focus:ring-4 focus:ring-red-200 focus:border-red-800 bg-gray-50 transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 pr-3 lg:pr-4 flex items-center">
                {isSearching ? (
                  <div className="relative">
                    <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-b-2 border-red-800"></div>
                    <div className="absolute inset-0 animate-ping rounded-full h-5 w-5 lg:h-6 lg:w-6 border border-red-300 opacity-20"></div>
                  </div>
                ) : (
                  <div className="p-1.5 lg:p-2 bg-gradient-to-br from-red-800 to-red-900 rounded-lg">
                    <Search className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mt-3 lg:mt-4 gap-2 lg:gap-0">
              <p className="text-xs lg:text-sm text-gray-500 flex items-center gap-2">
                <Sparkles className="h-3 w-3 lg:h-4 lg:w-4 text-yellow-500" />
                Search by phone number, last 4 digits, area code, or customer name
              </p>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="hidden lg:inline">Use ↑↓ arrows & Enter | No match? Press Enter to add new customer</span>
                <span className="lg:hidden">↑↓ arrows & Enter</span>
              </div>
            </div>
          </div>

          {/* Two Column Layout - Numpad and Search Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
            {/* Left Column - Touch Numpad */}
            <Numpad
              onNumberClick={handleNumpadNumber}
              onBackspace={handleNumpadBackspace}
              onClear={handleNumpadClear}
            />

            {/* Right Column - Search Results */}
            <SearchResults
              searchResults={searchResults}
              searchQuery={searchQuery}
              isSearching={isSearching}
              hasSearched={hasSearched}
              selectedIndex={selectedIndex}
              onSelectCustomer={handleSelectCustomer}
              onCreateCustomer={() => setShowCreateDialog(true)}
              formatPhoneDisplay={formatPhoneDisplay}
              formatLastOrderDate={formatLastOrderDate}
            />
          </div>
        </div>
      </div>

      {/* Customer Creation Dialog with Suspense for lazy loading */}
      {showCreateDialog && (
        <React.Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </div>
        }>
          <CustomerFormDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSubmit={handleCreateCustomer}
            initialPhone={searchQuery}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default memo(CustomerLookupPage); 