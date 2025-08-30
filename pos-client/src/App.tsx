import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import CustomerLookupPage from './pages/CustomerLookupPage';
import DeliveryDetailsPage from './pages/DeliveryDetailsPage';
import PickupDetailsPage from './pages/PickupDetailsPage';
import OrderTypePage from './pages/OrderTypePage';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { NotificationsContainer } from './components/NotificationsContainer';
import ErrorBoundary from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useMenuCache } from './hooks/useMenuCache';
import { MenuTriggeredDailyReport } from './components/layout/MenuTriggeredDailyReport';
import { MenuTriggeredCustomReport } from './components/layout/MenuTriggeredCustomReport';
import { PrintQueueIndicator } from './components/PrintQueueIndicator';
import { PaperStatusIndicator } from './components/PaperStatusIndicator';

import './index.css';

function AppContent() {
  const { currentStore } = useStore();
  
  // Cache menu data for the current store
  const { error: cacheError } = useMenuCache(currentStore?.id || '');

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <OfflineIndicator />
      <NotificationsContainer />
      <MenuTriggeredDailyReport />
      <MenuTriggeredCustomReport />
      <PrintQueueIndicator />
      <PaperStatusIndicator />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Navigate to="/customer-lookup" replace />
          </ProtectedRoute>
        } />
        <Route path="/order" element={
          <ProtectedRoute>
            <OrderTypePage />
          </ProtectedRoute>
        } />
        <Route path="/order/pickup-details" element={
          <ProtectedRoute>
            <PickupDetailsPage />
          </ProtectedRoute>
        } />
        <Route path="/order/delivery-details" element={
          <ProtectedRoute>
            <DeliveryDetailsPage />
          </ProtectedRoute>
        } />
        <Route path="/menu" element={
          <ProtectedRoute>
            <MenuPage />
          </ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />
        <Route path="/customer-lookup" element={
          <ProtectedRoute>
            <CustomerLookupPage />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <StoreProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </StoreProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
