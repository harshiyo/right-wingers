import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { CustomerProvider } from './context/CustomerContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import DeliveryDetailsPage from './pages/DeliveryDetailsPage';
import CustomerInfoPage from './pages/CustomerInfoPage';
import StoreSelectionPage from './pages/StoreSelectionPage';
import CheckoutPage from './pages/CheckoutPage';
import ConfirmationPage from './pages/ConfirmationPage';

// Protected route component that requires store selection
function RequireStore({ children }: { children: JSX.Element }) {
  const { selectedStore, loading } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!selectedStore) {
    return <Navigate to="/select-store" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <CartProvider>
      <CustomerProvider>
        <Routes>
          <Route path="/select-store" element={<StoreSelectionPage />} />
          
          <Route path="/" element={
            <RequireStore>
              <HomePage />
            </RequireStore>
          } />
          
          <Route path="/delivery-details" element={
            <RequireStore>
              <DeliveryDetailsPage />
            </RequireStore>
          } />
          
          <Route path="/customer-info" element={
            <RequireStore>
              <CustomerInfoPage />
            </RequireStore>
          } />
          
          <Route path="/menu" element={
            <RequireStore>
              <MenuPage />
            </RequireStore>
          } />
          
          <Route path="/cart" element={
            <RequireStore>
              <CartPage />
            </RequireStore>
          } />

          <Route path="/checkout" element={
            <RequireStore>
              <CheckoutPage />
            </RequireStore>
          } />

          <Route path="/confirmation" element={
            <RequireStore>
              <ConfirmationPage />
            </RequireStore>
          } />
          
          <Route path="*" element={<Navigate to="/select-store" replace />} />
        </Routes>
      </CustomerProvider>
    </CartProvider>
  );
}

function App() {
  return (
    <StoreProvider>
      <AppRoutes />
    </StoreProvider>
  );
}

export default App; 