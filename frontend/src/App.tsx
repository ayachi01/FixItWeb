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
import ChatLogs from '@/features/chat/components/ChatLogs';
import { SupportForm } from '@/features/support/components/SupportForm';
import { FeedbackForm } from '@/features/support/components/FeedbackForm';
import ReportPage from '@/features/report/components/ReportPage';
import { ThemeProvider } from "@/components/theme-provider";

// Component to handle authenticated redirects for login/register
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Dashboard Home Component (what shows when you're just on /dashboard)
const DashboardHome = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 pt-0 space-y-6">
      {/* Your existing dashboard content */}
    </div>
  );
};

// Main App component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
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

      {/* Legal pages */}
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* OTP verification */}
      <Route
        path="/verify-otp"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <VerifyOtp
              email="user@example.com"
              onSuccess={() => {}}
              onBack={() => {}}
              onResendOtp={() => {}}
            />
          </div>
        }
      />

      {/* Protected dashboard routes with nested routing */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="chat" element={<ChatLogs />} />
        <Route path="reports" element={<ReportPage />} />
        <Route path="support" element={<SupportForm />} />
        <Route path="feedback" element={<FeedbackForm />} />
      </Route>
      
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Legacy route redirects */}
      <Route path="/db" element={<Navigate to="/dashboard" replace />} />
      <Route path="/ToS" element={<Navigate to="/terms" replace />} />
      <Route path="/Privacy-policy" element={<Navigate to="/privacy" replace />} />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <AppRoutes />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;