import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, Navigation, Clock, Phone, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import Layout from '../components/Layout';

export default function StoreSelectionPage() {
  const navigate = useNavigate();
  const { stores, loading, error, selectStore, findNearestStore, selectedStore } = useStore();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [findingLocation, setFindingLocation] = useState(false);

  useEffect(() => {
    // Clear any previously selected store when landing on this page
    localStorage.removeItem('selectedStoreId');
  }, []);

  const handleUseLocation = async () => {
    setFindingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const nearestStore = await findNearestStore(
        position.coords.latitude,
        position.coords.longitude
      );

      if (nearestStore) {
        selectStore(nearestStore.id);
        navigate('/');
      } else {
        setLocationError('No stores found near your location.');
      }
    } catch (err) {
      console.error('Error getting location:', err);
      setLocationError('Could not access your location. Please select a store manually.');
    } finally {
      setFindingLocation(false);
    }
  };

  const handleSelectStore = (storeId: string) => {
    selectStore(storeId);
    navigate('/');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-red-600 mx-auto"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-red-400 opacity-20"></div>
            </div>
            <p className="mt-6 text-gray-600 font-medium">Loading stores...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Enhanced background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-br from-red-200 to-orange-200 rounded-full opacity-30 blur-2xl"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-br from-orange-200 to-yellow-200 rounded-full opacity-40 blur-2xl"></div>
        <div className="absolute bottom-40 left-20 w-36 h-36 bg-gradient-to-br from-yellow-200 to-red-100 rounded-full opacity-35 blur-2xl"></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-gradient-to-br from-red-100 to-pink-100 rounded-full opacity-45 blur-2xl"></div>
        
        {/* Additional smaller elements */}
        <div className="absolute top-60 left-1/4 w-16 h-16 bg-blue-100 rounded-full opacity-25 blur-xl"></div>
        <div className="absolute bottom-60 right-1/4 w-20 h-20 bg-purple-100 rounded-full opacity-30 blur-xl"></div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/30 via-transparent to-gray-50/20"></div>
      </div>

      {/* Main content with enhanced shadows */}
      <div className="max-w-6xl mx-auto px-4 py-6 relative z-10">
        {/* Header Section with shadow */}
        <div className="text-center mb-8 p-6 bg-gradient-to-br from-gray-100 to-gray-200 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-300/50">
          <h1 className="text-3xl font-bold text-gray-900 mb-3 drop-shadow-sm">Find Your Store</h1>
          <p className="text-gray-700 text-lg mb-4">Choose your preferred location to start ordering</p>
          <div className="bg-white/60 rounded-xl p-4 border border-gray-200">
            <p className="text-gray-800 text-sm leading-relaxed">
              <strong>Quick Options:</strong><br />
              • <strong>Let us find the nearest store:</strong> Click "Use my location" below<br />
              • <strong>Choose your preferred store:</strong> Scroll down and select from our locations
            </p>
          </div>
        </div>

        {/* Location Button with enhanced styling */}
        <div className="mb-6">
          <div className="relative">
            <button
              onClick={handleUseLocation}
              disabled={findingLocation}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 font-semibold text-base disabled:opacity-70 relative overflow-hidden group"
            >
              {/* Button glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              
              {findingLocation ? (
                <>
                  <div className="relative">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  </div>
                  <span>Finding nearest store...</span>
                </>
              ) : (
                <>
                  <div className="p-1.5 bg-white/20 rounded-lg shadow-inner">
                    <Navigation className="h-5 w-5" />
                  </div>
                  <span>Use my location</span>
                </>
              )}
            </button>
            {/* Button shadow */}
            <div className="absolute inset-0 bg-red-900/20 rounded-xl blur-lg -z-10"></div>
          </div>
          {locationError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl shadow-md">
              <p className="text-red-700 text-sm text-center">{locationError}</p>
            </div>
          )}
        </div>

        {/* Manual Store Selection with enhanced styling */}
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-300/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-gray-200 rounded-lg shadow-sm">
              <Store className="h-4 w-4 text-gray-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 drop-shadow-sm">Select a store manually</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stores.map(store => {
              const isSelected = selectedStore?.id === store.id;
              return (
                <button
                  key={store.id}
                  onClick={() => handleSelectStore(store.id)}
                  className={`w-full rounded-xl p-4 transition-all duration-300 text-left group relative overflow-hidden ${
                    isSelected 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 shadow-lg hover:shadow-xl' 
                      : 'bg-white/80 backdrop-blur-sm border border-white/60 hover:border-red-200 shadow-md hover:shadow-lg'
                  }`}
                >
                  {/* Selected state glow effect */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 opacity-50 blur-sm"></div>
                  )}
                  
                  {/* Card glow effect for non-selected */}
                  {!isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  )}
                  
                  <div className="flex items-start gap-3 relative z-10">
                    <div className={`p-2 rounded-lg transition-colors shadow-sm flex-shrink-0 ${
                      isSelected 
                        ? 'bg-green-100 group-hover:bg-green-200' 
                        : 'bg-red-50 group-hover:bg-red-100'
                    }`}>
                      {isSelected ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <MapPin className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-base mb-1 truncate drop-shadow-sm ${
                        isSelected ? 'text-green-800' : 'text-gray-900'
                      }`}>
                        {store.name}
                      </h3>
                      <p className={`text-sm mb-2 line-clamp-2 ${
                        isSelected ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {store.address}
                      </p>
                      <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs ${
                        isSelected ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{store.phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>Open Now</span>
                        </div>
                      </div>
                    </div>
                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${
                      isSelected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Card shadow */}
                  <div className={`absolute inset-0 rounded-xl blur-sm -z-10 ${
                    isSelected ? 'bg-green-900/10' : 'bg-gray-900/5'
                  }`}></div>
                  
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
} 