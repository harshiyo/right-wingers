import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCustomers, Customer, saveCustomerToFirebase } from '../data/customers';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Numpad } from '../components/ui/Numpad';
import { SearchResults } from '../components/ui/SearchResults';
import { TopBar } from '../components/layout/TopBar';
import { Search, Sparkles, Clock, AlertTriangle, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

// Lazy load the CustomerFormDialog to improve initial load time
const CustomerFormDialog = React.lazy(() => import('../components/CustomerFormDialog').then(module => ({ default: module.CustomerFormDialog })));

// Error dialog component for better UX
const ErrorDialog = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'error' 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
  type?: 'error' | 'warning' | 'info'; 
}) => {
  if (!isOpen) return null;

  const bgColor = type === 'error' ? 'bg-red-50' : type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50';
  const borderColor = type === 'error' ? 'border-red-200' : type === 'warning' ? 'border-yellow-200' : 'border-blue-200';
  const iconColor = type === 'error' ? 'text-red-600' : type === 'warning' ? 'text-yellow-600' : 'text-blue-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className={`${bgColor} ${borderColor} border-2 rounded-2xl shadow-2xl max-w-md w-full p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Blocked customer dialog component
const BlockedCustomerDialog = ({ 
  isOpen, 
  onClose, 
  customer 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  customer: Customer; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Customer Blocked</h3>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 text-red-800">
          <p><strong>Name:</strong> {customer.name}</p>
          <p><strong>Phone:</strong> {customer.phone}</p>
          <p><strong>Reason:</strong> {customer.blockedReason || 'No reason provided'}</p>
          <p><strong>Blocked on:</strong> {customer.blockedDate ? new Date(customer.blockedDate).toLocaleDateString() : 'Unknown date'}</p>
          <p><strong>Blocked by:</strong> {customer.blockedBy || 'Unknown'}</p>
        </div>
        <p className="text-red-700 mt-4 font-medium">
          This customer is blocked and cannot place orders.
        </p>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerLookupPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1); // For keyboard navigation
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });
  const [blockedCustomerDialog, setBlockedCustomerDialog] = useState<{ isOpen: boolean; customer: Customer | null }>({
    isOpen: false,
    customer: null
  });
  
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { currentStore } = useStore();

  // Validate store ID and provide fallback
  const storeId = useMemo(() => {
    if (!currentStore?.id) {
      console.warn('⚠️ No current store selected, using fallback store ID');
      return 'store_001'; // This should be replaced with actual fallback logic
    }
    return currentStore.id;
  }, [currentStore?.id]);

  // Auto-focus the phone input when page loads and keep it focused
  useEffect(() => {
    const focusInput = () => {
      if (phoneInputRef.current && !showCreateDialog) {
        phoneInputRef.current.focus();
      }
    };

    focusInput();
    
    // Keep input focused when clicking anywhere on the page
    const handlePageClick = (e: MouseEvent) => {
      // Don't refocus if clicking on buttons, interactive elements, or if dialog is open
      const target = e.target as HTMLElement;
      if (!showCreateDialog && 
          !target.closest('button') && 
          !target.closest('a') && 
          !target.closest('input[type="datetime-local"]') &&
          !target.closest('[role="dialog"]')) {
        setTimeout(focusInput, 100); // Small delay to ensure proper focus
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
      const results = await searchCustomers(query, storeId);
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Search failed:', error);
      setSearchResults([]);
      setErrorDialog({
        isOpen: true,
        title: 'Search Error',
        message: 'Failed to search for customers. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSearching(false);
    }
  }, [storeId]);

  // Optimized debounced search with cleanup
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // Increased to 300ms for better user experience

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Optimized auto-selection logic with useMemo
  const autoSelectionIndex = useMemo(() => {
    if (searchResults.length === 0) return -1;
    
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
        return searchResults.findIndex(customer => customer.id === exactMatch.id);
      }
    }
    
    return 0; // Select first result by default
  }, [searchResults, searchQuery]);

  // Update selected index when auto-selection changes
  useEffect(() => {
    setSelectedIndex(autoSelectionIndex);
  }, [autoSelectionIndex]);

  // Memoized formatters to prevent recreation
  const formatPhoneDisplay = useCallback((phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }, []);

  const formatLastOrderDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  // Memoized handlers
  const handleSelectCustomer = useCallback((customer: Customer) => {
    // Check if customer is blocked
    if (customer.isBlocked) {
      setBlockedCustomerDialog({
        isOpen: true,
        customer
      });
      return;
    }
    
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
        storeId,
      };
      
      // Save to Firebase first
      const savedCustomer = await saveCustomerToFirebase(newCustomerData);
      
      // Navigate to order page with the saved customer
      navigate('/order', { 
        state: { 
          customer: savedCustomer, 
          phone: savedCustomer.phone 
        } 
      });
    } catch (error) {
      console.error('❌ Failed to save customer:', error);
      
      // Show error dialog
      setErrorDialog({
        isOpen: true,
        title: 'Customer Creation Failed',
        message: 'Could not save customer to database. Please try again or contact support if the problem persists.',
        type: 'error'
      });
    }
  }, [navigate, storeId]);

  // Numpad handlers
  const handleNumpadNumber = useCallback((number: string) => {
    setSearchQuery(prev => prev + number);
  }, []);

  const handleNumpadBackspace = useCallback(() => {
    setSearchQuery(prev => prev.slice(0, -1));
  }, []);

  const handleNumpadClear = useCallback(() => {
    setSearchQuery('');
    setSelectedIndex(-1);
    setSearchResults([]);
    setHasSearched(false);
  }, []);

  // Enhanced keyboard navigation with better edge case handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys if dialogs are open
      if (showCreateDialog || blockedCustomerDialog.isOpen || errorDialog.isOpen) {
        return;
      }

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
        case 'Escape':
          e.preventDefault();
          if (searchQuery.length > 0) {
            handleNumpadClear();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, selectedIndex, hasSearched, isSearching, searchQuery.length, handleSelectCustomer, showCreateDialog, blockedCustomerDialog.isOpen, errorDialog.isOpen, handleNumpadClear]);

  // Close dialogs when navigating away
  useEffect(() => {
    return () => {
      setShowCreateDialog(false);
      setBlockedCustomerDialog({ isOpen: false, customer: null });
      setErrorDialog({ isOpen: false, title: '', message: '', type: 'error' });
    };
  }, []);

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
          {/* Enhanced Search Section */}
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl border border-gray-100 p-4 lg:p-8 mb-4 lg:mb-8">
            <div className="relative">
              <PhoneInput
                ref={phoneInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by phone number or name..."
                className="pl-4 lg:pl-6 pr-12 lg:pr-16 py-3 lg:py-4 w-full text-base lg:text-lg border-2 border-gray-200 rounded-xl lg:rounded-2xl focus:ring-4 focus:ring-red-200 focus:border-red-800 bg-gray-50 transition-all duration-200"
                aria-label="Search customers by phone number or name"
              />
              <div className="absolute inset-y-0 right-0 pr-3 lg:pr-4 flex items-center">
                {isSearching ? (
                  <div className="relative" role="status" aria-label="Searching">
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
                <span className="hidden lg:inline">Use ↑↓ arrows & Enter | No match? Press Enter to add new customer | Press Esc to clear</span>
                <span className="lg:hidden">↑↓ arrows & Enter | Esc to clear</span>
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

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
        title={errorDialog.title}
        message={errorDialog.message}
        type={errorDialog.type}
      />

      {/* Blocked Customer Dialog */}
      <BlockedCustomerDialog
        isOpen={blockedCustomerDialog.isOpen}
        onClose={() => setBlockedCustomerDialog({ isOpen: false, customer: null })}
        customer={blockedCustomerDialog.customer!}
      />
    </div>
  );
};

export default memo(CustomerLookupPage); 