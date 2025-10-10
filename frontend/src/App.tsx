// 📂 src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// 🔑 Authentication Pages (public - before login)
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPasswordChoice from "./pages/Auth/ForgotPasswordChoice";
import ForgotPassword from "./pages/Auth/ForgotPasswordEmail";
import ResetPassword from "./pages/Auth/ResetPassword";
import ForgotPasswordOTP from "./pages/Auth/ForgotPasswordOTP";
import VerifyEmailPage from "./pages/Auth/VerifyEmailPage";
import InviteRegisterPage from "./pages/Dashboard/InviteRegisterPage"; // ✅ Invite registration page

// 🏠 Public landing page (for visitors before login)
import HomePage from "./pages/Dashboard/HomePage"; // ✅ New homepage

// 🔒 Layout wrapper (only checks if user is logged in)
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Dashboard/DashboardLayout";

// 📊 Dashboard Pages (all accessible once logged in)
import SubmitTicketPage from "./pages/Dashboard/SubmitTicketPage"; // Submit new ticket
import AssignedTicketsPage from "./pages/Dashboard/MyUnassignTicketsPage"; // View tickets assigned to user used by university administrators and maintenance supervisors offer
import MyTicketsPage from "./pages/Dashboard/MyTicketsPage"; // View tickets submitted by user
import FixerAssignedTicketsPage from "./pages/Dashboard/MyAssignedTicketsPage"; // View tickets assigned to fixer this is used by fixers to view tickets assigned to them
import AdminDashboardPage from "./pages/Dashboard/DashboardPage";
import AllTicketsPage from "./pages/Dashboard/AllTicketsPage"; // View all tickets university administrators and maintenance officer
import TicketDetailPage from "./pages/Dashboard/TicketDetailPage"; // View ticket details
import EditTicketPage from "./pages/Dashboard/EditTicketPage"; // Edit ticket details
import UsersPage from "./pages/Dashboard/UsersPage"; // Manage users used by HR and Registrar
import UserDetailPage from "./pages/Dashboard/UserDetailPage"; // View user details
import RolesManagementPage from "./pages/Dashboard/RolesManagementPage"; // Manage roles and permissions
import AuditLogsPage from "./pages/Dashboard/AuditLogsPage"; // View audit logs
import SystemSettingsPage from "./pages/Dashboard/SystemSettingsPage"; // System configuration
import ReportsPage from "./pages/Dashboard/ReportsPage"; // Analytics and reports
import NotificationsPage from "./pages/Dashboard/NotificationsPage"; // User notifications

// ✅ Invite management pages
import InviteUserPage from "./pages/Dashboard/InviteUserPage"; // Invite new staff members to the system
import InvitesListPage from "./pages/Dashboard/InvitesListPage"; // Optional page to list all invites

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* 🏠 Public routes */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <HomePage />}
        />
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
        <Route path="/invite/:token" element={<InviteRegisterPage />} />

        {/* 🔒 Protected routes (dashboard) */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Default redirect for dashboard */}
          <Route index element={<Navigate to="main" replace />} />

          {/* 🚪 Feature pages */}
          <Route path="main" element={<AdminDashboardPage />} />
          <Route path="submit-ticket" element={<SubmitTicketPage />} />
          <Route path="my-tickets" element={<MyTicketsPage />} />
          <Route path="assigned-tickets" element={<AssignedTicketsPage />} />
          <Route
            path="my-assigned-tickets"
            element={<FixerAssignedTicketsPage />}
          />
          <Route path="tickets" element={<AllTicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="tickets/:id/edit" element={<EditTicketPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="roles" element={<RolesManagementPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<SystemSettingsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="invite" element={<InviteUserPage />} />
          <Route path="invites" element={<InvitesListPage />} />
        </Route>

        {/* Catch-all for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
