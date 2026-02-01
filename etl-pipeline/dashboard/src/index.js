import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LoginPage from './components/LoginPage';
import ChangePassword from './components/ChangePassword';
import AdminPage from './components/AdminPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';

/**
 * AppWrapper Component
 * Handles authentication routing:
 * 1. Login page for unauthenticated users
 * 2. Change password page for users with needsPasswordChange=true
 * 3. Admin page for admin user when navigating to /admin
 * 4. Main dashboard for authenticated users
 */
const AppWrapper = () => {
  const { isAuthenticated, isLoading, needsPasswordChange, isAdmin } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CBC0] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show change password page if user needs to set new password
  if (needsPasswordChange) {
    return <ChangePassword />;
  }

  // Show admin page if user is admin and requested it
  if (showAdmin && isAdmin()) {
    return <AdminPage onBack={() => setShowAdmin(false)} />;
  }

  // Show dashboard - pass admin handler
  return <App onAdminClick={() => setShowAdmin(true)} />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppWrapper />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
