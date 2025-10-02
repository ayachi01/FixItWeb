import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPasswordChoice from "./pages/ForgotPasswordChoice";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ForgotPasswordOTP from "./pages/ForgotPasswordOTP";
import VerifyEmailPage from "./pages/VerifyEmailPage";

// Protected
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Student/Staff Pages
import SubmitTicketPage from "./pages/SubmitTicketPage";
import AssignedTicketsPage from "./pages/AssignedTicketsPage";
import MyTicketsPage from "./pages/MyTicketsPage";

// Admin Pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AllTicketsPage from "./pages/admin/AllTicketsPage";
import TicketDetailPage from "./pages/admin/TicketDetailPage";
import UsersPage from "./pages/admin/UsersPage";
import UserDetailPage from "./pages/admin/UserDetailPage";
import RolesManagementPage from "./pages/admin/RolesManagementPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import SystemSettingsPage from "./pages/admin/SystemSettingsPage";

// Optional Admin Pages
import ReportsPage from "./pages/admin/ReportsPage";
import NotificationsPage from "./pages/admin/NotificationsPage";
import BulkActionsPage from "./pages/admin/BulkActionsPage";

// Dashboards
function StudentDashboard() {
  return <Navigate to="/submit-ticket" replace />;
}
function StaffDashboard() {
  return <Navigate to="/assigned-tickets" replace />;
}

export default function App() {
  const { user } = useAuthStore();

  // 🔹 Decide default dashboard based on permissions
  const getDashboard = () => {
    if (!user) return <Navigate to="/login" replace />;

    const { permissions } = user;

    if (permissions.is_admin_level || permissions.can_manage_users) {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (permissions.can_fix || permissions.can_assign) {
      return <StaffDashboard />;
    }

    if (permissions.can_report) {
      return <StudentDashboard />;
    }

    return <Navigate to="/login" replace />;
  };

  // 🔹 Admin route protection
  const AdminRoute = ({ element }: { element: React.ReactNode }) => {
    if (!user) return <Navigate to="/login" replace />;
    const { permissions } = user;
    if (!permissions.is_admin_level && !permissions.can_manage_users) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{element}</>;
  };

  // 🔹 Staff route protection
  const StaffRoute = ({ element }: { element: React.ReactNode }) => {
    if (!user) return <Navigate to="/login" replace />;
    const { permissions } = user;
    if (
      !permissions.can_report &&
      !permissions.can_fix &&
      !permissions.can_assign
    ) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{element}</>;
  };

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPasswordChoice />} />
        <Route path="/forgot-password/email" element={<ForgotPassword />} />
        <Route path="/forgot-password/otp" element={<ForgotPasswordOTP />} />
        <Route
          path="/reset-password/:uidb64/:token"
          element={<ResetPassword />}
        />
        <Route
          path="/verify-email/:uidb64/:token"
          element={<VerifyEmailPage />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={getDashboard()} />

          {/* Student/Staff */}
          <Route
            path="submit-ticket"
            element={<StaffRoute element={<SubmitTicketPage />} />}
          />
          <Route
            path="my-tickets"
            element={<StaffRoute element={<MyTicketsPage />} />}
          />
          <Route
            path="assigned-tickets"
            element={<StaffRoute element={<AssignedTicketsPage />} />}
          />

          {/* Admin */}
          <Route
            path="admin/dashboard"
            element={<AdminRoute element={<AdminDashboardPage />} />}
          />
          <Route
            path="admin/tickets"
            element={<AdminRoute element={<AllTicketsPage />} />}
          />
          <Route
            path="admin/tickets/:id"
            element={<AdminRoute element={<TicketDetailPage />} />}
          />
          <Route
            path="admin/users"
            element={<AdminRoute element={<UsersPage />} />}
          />
          <Route
            path="admin/users/:id"
            element={<AdminRoute element={<UserDetailPage />} />}
          />
          <Route
            path="admin/roles"
            element={<AdminRoute element={<RolesManagementPage />} />}
          />
          <Route
            path="admin/audit-logs"
            element={<AdminRoute element={<AuditLogsPage />} />}
          />
          <Route
            path="admin/settings"
            element={<AdminRoute element={<SystemSettingsPage />} />}
          />

          {/* Optional Admin */}
          <Route
            path="admin/reports"
            element={<AdminRoute element={<ReportsPage />} />}
          />
          <Route
            path="admin/notifications"
            element={<AdminRoute element={<NotificationsPage />} />}
          />
          <Route
            path="admin/bulk-actions"
            element={<AdminRoute element={<BulkActionsPage />} />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
