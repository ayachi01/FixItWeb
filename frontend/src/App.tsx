import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// Auth Pages
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPasswordChoice from "./pages/Auth/ForgotPasswordChoice";
import ForgotPassword from "./pages/Auth/ForgotPasswordEmail";
import ResetPassword from "./pages/Auth/ResetPassword";
import ForgotPasswordOTP from "./pages/Auth/ForgotPasswordOTP";
import VerifyEmailPage from "./pages/Auth/VerifyEmailPage";

// Protected
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Dashboard/DashboardLayout";

// Dashboard Pages
import SubmitTicketPage from "./pages/Dashboard/SubmitTicketPage";
import AssignedTicketsPage from "./pages/Dashboard/AssignedTicketsPage";
import MyTicketsPage from "./pages/Dashboard/MyTicketsPage";
import FixerAssignedTicketsPage from "./pages/Dashboard/FixerAssignedTicketsPage";
import AdminDashboardPage from "./pages/Dashboard/DashboardPage";
import AllTicketsPage from "./pages/Dashboard/AllTicketsPage";
import TicketDetailPage from "./pages/Dashboard/TicketDetailPage";
import UsersPage from "./pages/Dashboard/UsersPage";
import UserDetailPage from "./pages/Dashboard/UserDetailPage";
import RolesManagementPage from "./pages/Dashboard/RolesManagementPage";
import AuditLogsPage from "./pages/Dashboard/AuditLogsPage";
import SystemSettingsPage from "./pages/Dashboard/SystemSettingsPage";
import ReportsPage from "./pages/Dashboard/ReportsPage";
import NotificationsPage from "./pages/Dashboard/NotificationsPage";
import BulkActionsPage from "./pages/Dashboard/BulkActionsPage";

export default function App() {
  const { user } = useAuthStore();

  // 🔹 Default redirect based on permissions
  const getDefaultDashboard = () => {
    if (!user) return <Navigate to="/login" replace />;
    const { permissions } = user;

    if (permissions.is_admin_level || permissions.can_manage_users) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (permissions.can_fix || permissions.can_assign) {
      return <Navigate to="/assigned-tickets" replace />;
    }
    if (permissions.can_report) {
      return <Navigate to="/submit-ticket" replace />;
    }

    return <Navigate to="/login" replace />;
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

        {/* Auth pages */}
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

        {/* Protected Dashboard Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard default redirect */}
          <Route path="dashboard" element={getDefaultDashboard()} />

          {/* Student / Staff Pages */}
          <Route path="submit-ticket" element={<SubmitTicketPage />} />
          <Route path="my-tickets" element={<MyTicketsPage />} />
          <Route path="assigned-tickets" element={<AssignedTicketsPage />} />
          <Route
            path="my-assigned-tickets"
            element={<FixerAssignedTicketsPage />}
          />

          {/* Admin Pages */}
          <Route path="admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="admin/tickets" element={<AllTicketsPage />} />
          <Route path="admin/tickets/:id" element={<TicketDetailPage />} />
          <Route path="admin/users" element={<UsersPage />} />
          <Route path="admin/users/:id" element={<UserDetailPage />} />
          <Route path="admin/roles" element={<RolesManagementPage />} />
          <Route path="admin/audit-logs" element={<AuditLogsPage />} />
          <Route path="admin/settings" element={<SystemSettingsPage />} />

          {/* Optional Admin Pages */}
          <Route path="admin/reports" element={<ReportsPage />} />
          <Route path="admin/notifications" element={<NotificationsPage />} />
          <Route path="admin/bulk-actions" element={<BulkActionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
