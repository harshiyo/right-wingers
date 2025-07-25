import React from 'react';
import { Store, ChevronDown, MapPin, Clock } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const StoreSelector: React.FC = () => {
  const { currentStore, availableStores, switchStore, currentUser } = useStore();

  if (!currentStore || availableStores.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <Store className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-800">
          {currentStore?.name || 'No Store Selected'}
        </span>
      </div>
    );
  }

  const handleStoreChange = (storeId: string) => {
    switchStore(storeId);
  };

  const getCurrentOperatingStatus = (store: typeof currentStore) => {
    if (!store) return 'Unknown';
    
    // Simple logic to prevent errors - assume open during business hours
    const now = new Date();
    const currentHour = now.getHours();
    
    // Simple logic: open from 11 AM to 10 PM
    if (currentHour >= 11 && currentHour < 22) {
      return 'Open';
    }
    
    return 'Closed';
  };

  return (
    <div className="relative min-w-[250px]">
      <div className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="flex-shrink-0">
          <Store className="h-4 w-4 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 truncate">
              {currentStore.name}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0 ml-2" />
          </div>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500 truncate">
                {currentStore.address?.split(',')[1] || currentStore.address || 'Location'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className={`text-xs font-medium ${
                getCurrentOperatingStatus(currentStore) === 'Open' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {getCurrentOperatingStatus(currentStore)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown Options - Hidden by default, would need state management for toggle */}
      <div className="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
        {availableStores.map((store) => (
          <div
            key={store.id}
            onClick={() => handleStoreChange(store.id)}
            className={`px-3 py-3 cursor-pointer transition-colors ${
              store.id === currentStore.id
                ? 'bg-red-50 border-l-4 border-red-500'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <Store className={`h-4 w-4 mt-0.5 ${
                store.id === currentStore.id ? 'text-red-600' : 'text-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    store.id === currentStore.id ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {store.name}
                  </span>
                  {store.id === currentStore.id && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 truncate">
                      {store.address || 'No address'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className={`text-xs font-medium ${
                      getCurrentOperatingStatus(store) === 'Open' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {getCurrentOperatingStatus(store)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Role indicator */}
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Access Level:</span>
            <span className="text-xs font-medium text-gray-700 capitalize">
              {currentUser?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 