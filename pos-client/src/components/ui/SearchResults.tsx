import React from 'react';
import { Users, UserPlus, Search } from 'lucide-react';
import { Customer } from '../../data/customers';

interface SearchResultsProps {
  searchResults: Customer[];
  searchQuery: string;
  isSearching: boolean;
  hasSearched: boolean;
  selectedIndex: number;
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer: () => void;
  formatPhoneDisplay: (phone: string) => string;
  formatLastOrderDate: (date: string) => string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  searchQuery,
  isSearching,
  hasSearched,
  selectedIndex,
  onSelectCustomer,
  onCreateCustomer,
  formatPhoneDisplay,
  formatLastOrderDate
}) => {
  const showNoResults = hasSearched && !isSearching && searchResults.length === 0 && searchQuery.length >= 3;
  const showResults = searchResults.length > 0;

  if (!hasSearched && searchQuery.length < 3) {
    return (
      <div className="rounded-2xl lg:rounded-3xl p-4 lg:p-8 text-white shadow-2xl" style={{ backgroundColor: '#800000' }}>
        <div className="flex items-center gap-2 lg:gap-4 mb-4 lg:mb-6">
          <div className="p-2 lg:p-3 bg-white/20 rounded-lg lg:rounded-xl backdrop-blur-sm">
            <UserPlus className="h-5 w-5 lg:h-8 lg:w-8" />
          </div>
          <h3 className="text-lg lg:text-2xl font-bold">New Customer?</h3>
        </div>
        <p className="text-red-100 mb-4 lg:mb-6 leading-relaxed text-sm lg:text-base">
          Don't see the customer in our system? No problem! Create a new customer profile in seconds.
        </p>
        <div className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl text-sm lg:text-base">
          Start typing to search customers
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="rounded-2xl lg:rounded-3xl p-4 lg:p-6 text-white shadow-2xl" style={{ backgroundColor: '#800000' }}>
        <div className="flex items-center gap-2 lg:gap-4 mb-4 lg:mb-6">
          <div className="p-2 lg:p-3 bg-white/20 rounded-lg lg:rounded-xl backdrop-blur-sm">
            <Users className="h-5 w-5 lg:h-8 lg:w-8" />
          </div>
          <h3 className="text-lg lg:text-2xl font-bold">Found {searchResults.length} Customer{searchResults.length !== 1 ? 's' : ''}</h3>
        </div>
        
        <div className="relative">
          <div className="space-y-2 h-64 lg:h-80 overflow-y-auto scrollbar-hide p-1 lg:p-2 mb-2 lg:mb-3">
            {searchResults.map((customer, index) => (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className={`p-2 lg:p-3 rounded-lg lg:rounded-xl cursor-pointer border-2 transition-all ${
                  selectedIndex === index 
                    ? 'bg-white/50 border-yellow-400 shadow-lg' 
                    : 'bg-white/10 hover:bg-white/20 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedIndex === index && (
                      <div className="flex-shrink-0 w-4 h-4 lg:w-5 lg:h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm lg:text-base truncate">{customer.name}</h4>
                        {customer.isBlocked && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-red-100 text-xs lg:text-sm">{formatPhoneDisplay(customer.phone)}</p>
                      {customer.email && (
                        <p className="text-red-100 text-xs lg:text-sm">{customer.email}</p>
                      )}
                      {(customer.address?.street || customer.address?.city) && (
                        <p className="text-red-200 text-xs truncate">
                          {customer.address?.street && customer.address?.city 
                            ? `${customer.address.street}, ${customer.address.city}`
                            : customer.address?.street || customer.address?.city
                          }
                        </p>
                      )}
                      {customer.isBlocked && customer.blockedReason && (
                        <p className="text-red-300 text-xs truncate mt-1">
                          Blocked: {customer.blockedReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-xs lg:text-sm">{customer.orderCount} orders</p>
                    <p className="text-red-200 text-xs">{formatLastOrderDate(customer.lastOrderDate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {searchResults.length > 3 && (
            <div className="absolute bottom-0 left-0 right-0 h-6 lg:h-8 bg-gradient-to-t from-red-600/40 to-transparent pointer-events-none rounded-b-xl"></div>
          )}
        </div>
        
        {selectedIndex >= 0 && (
          <div className="p-2 lg:p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg lg:rounded-xl text-center h-10 lg:h-14 flex items-center justify-center">
            <span className="font-bold text-white text-sm lg:text-lg flex items-center justify-center gap-1 lg:gap-2">
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden lg:inline">Press Enter to select highlighted customer</span>
              <span className="lg:hidden">Press Enter to select</span>
            </span>
          </div>
        )}
      </div>
    );
  }

  if (showNoResults) {
    return (
      <div className="rounded-2xl lg:rounded-3xl p-4 lg:p-8 text-white shadow-2xl" style={{ backgroundColor: '#800000' }}>
        <div className="flex items-center gap-2 lg:gap-4 mb-4 lg:mb-6">
          <div className="p-2 lg:p-3 bg-white/20 rounded-lg lg:rounded-xl backdrop-blur-sm">
            <UserPlus className="h-5 w-5 lg:h-8 lg:w-8" />
          </div>
          <h3 className="text-lg lg:text-2xl font-bold">No Customer Found</h3>
        </div>
        <p className="text-orange-100 mb-4 lg:mb-6 leading-relaxed text-sm lg:text-base">
          We couldn't find a customer matching "<strong>{searchQuery}</strong>". 
          Let's create a new customer profile to get started!
        </p>
        <button
          onClick={onCreateCustomer}
          className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white font-bold px-4 lg:px-6 py-3 lg:py-4 rounded-lg lg:rounded-xl flex items-center justify-center gap-2 text-sm lg:text-base"
        >
          <UserPlus className="h-4 w-4 lg:h-5 lg:w-5" />
          Create New Customer
        </button>
        <div className="mt-2 lg:mt-3 p-2 lg:p-3 bg-white/20 rounded-lg lg:rounded-xl text-center">
          <span className="font-bold text-sm lg:text-base">Or press Enter to add new customer</span>
        </div>
      </div>
    );
  }

  return null;
}; 