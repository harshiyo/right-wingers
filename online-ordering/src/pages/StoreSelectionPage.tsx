import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, Navigation } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import Layout from '../components/Layout';

export default function StoreSelectionPage() {
  const navigate = useNavigate();
  const { stores, loading, error, selectStore, findNearestStore } = useStore();
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
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading stores...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Right Wingers Pizza" className="h-24 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-red-900">Find Your Store</h1>
        </div>

        {/* Location Button */}
        <div className="mb-8">
          <button
            onClick={handleUseLocation}
            disabled={findingLocation}
            className="w-full bg-gradient-to-r from-red-800 to-red-900 text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow flex items-center justify-center gap-3"
          >
            {findingLocation ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Finding nearest store...</span>
              </>
            ) : (
              <>
                <Navigation className="h-5 w-5" />
                <span>Use my location</span>
              </>
            )}
          </button>
          {locationError && (
            <p className="mt-2 text-red-600 text-sm text-center">{locationError}</p>
          )}
        </div>

        {/* Manual Store Selection */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-800">Select a store manually</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stores.map(store => (
              <button
                key={store.id}
                onClick={() => handleSelectStore(store.id)}
                className="w-full card-ux p-5 mb-6 text-left hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-red-800 mt-1 shrink-0" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 text-sm">{store.name}</h3>
                    <p className="text-xs text-gray-600">{store.address}</p>
                    <p className="text-xs text-gray-600">{store.phone}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
} 