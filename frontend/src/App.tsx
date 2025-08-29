// App.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoginPage from '@/pages/admin/Login';
import RegisterPage from '@/pages/admin/RegisterPage';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ForgotPasswordPage } from '@/pages/admin/ForgotPasswordPage';
import { VerifyOtp } from '@/features/auth/components/VerifyOtp';
import PrivacyPolicy from './pages/admin/legal/PrivacyPolicy';
import TermsOfService from './pages/admin/legal/TermsOfServices';
import Dashboard from './pages/admin/dashboard/Page';

// Component to handle authenticated redirects for login/register
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Main App component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes - redirect to dashboard if authenticated */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } 
      />
      
      <Route 
        path="/forgot-password" 
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        } 
      />

      {/* Legal pages - accessible to all */}
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* OTP verification - special case */}
      <Route
        path="/verify-otp"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <VerifyOtp
              email="user@example.com" // TODO: Replace with actual email from state/context
              onSuccess={() => { /* handle success */ }}
              onBack={() => { /* handle back */ }}
              onResendOtp={() => { /* handle resend OTP */ }}
            />
          </div>
        }
      />

      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Legacy route redirects for backward compatibility */}
      <Route path="/db" element={<Navigate to="/dashboard" replace />} />
      <Route path="/ToS" element={<Navigate to="/terms" replace />} />
      <Route path="/Privacy-policy" element={<Navigate to="/privacy" replace />} />
      
      {/* Catch all route - redirect to dashboard for authenticated users, login for others */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
};

export default App;