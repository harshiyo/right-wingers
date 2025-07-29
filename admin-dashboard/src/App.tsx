import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import Categories from './pages/Categories';
import Login from './pages/Login';
import Appearance from './pages/Appearance';
import Toppings from './pages/Toppings';
import Sauces from './pages/Sauces';
import Combos from './pages/Combos';
import Settings from './pages/Settings';
import LayoutManager from './pages/LayoutManager';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Feedback from './pages/Feedback';
import { Stores } from './pages/Stores';
import { EditableStores } from './pages/EditableStores';
import { UserManagement } from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import KitchenDisplay from './pages/KitchenDisplay';
import LiveLogs from './pages/LiveLogs';
import JobStatus from './pages/JobStatus';
import DiscountCodes from './pages/DiscountCodes';
import Analytics from './pages/Analytics';
import Marketing from './pages/Marketing';
import { SelectedStoreProvider } from './context/SelectedStoreContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import { jobScheduler } from './services/jobScheduler';

function App() {
  // Initialize job scheduler when app starts
  React.useEffect(() => {
    jobScheduler.initialize();
    
    // Cleanup on unmount
    return () => {
      jobScheduler.destroy();
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <SelectedStoreProvider>
            <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="stores" element={<EditableStores />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="role-management" element={<RoleManagement />} />
                <Route path="menu" element={<Menu />} />
                <Route path="categories" element={<Categories />} />
                <Route path="toppings" element={<Toppings />} />
                <Route path="sauces" element={<Sauces />} />
                <Route path="combos" element={<Combos />} />
                <Route path="customers" element={<Customers />} />
                <Route path="orders" element={<Orders />} />
                <Route path="kitchen" element={<KitchenDisplay />} />
                <Route path="feedback" element={<Feedback />} />
                <Route path="layout" element={<LayoutManager />} />
                <Route path="appearance" element={<Appearance />} />
                <Route path="settings" element={<Settings />} />
                <Route path="live-logs" element={<LiveLogs />} />
                <Route path="job-status" element={<JobStatus />} />
                <Route path="discount-codes" element={<DiscountCodes />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="marketing" element={<Marketing />} />
              </Route>
            </Routes>
          </Router>
          </SelectedStoreProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;