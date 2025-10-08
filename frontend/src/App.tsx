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

// 🔒 Layout wrapper (only checks if user is logged in)
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Dashboard/DashboardLayout";

// 📊 Dashboard Pages (all accessible once logged in)
import SubmitTicketPage from "./pages/Dashboard/SubmitTicketPage";
import AssignedTicketsPage from "./pages/Dashboard/MyUnassignTicketsPage";
import MyTicketsPage from "./pages/Dashboard/MyTicketsPage";
import FixerAssignedTicketsPage from "./pages/Dashboard/MyAssignedTicketsPage";
import AdminDashboardPage from "./pages/Dashboard/DashboardPage";
import AllTicketsPage from "./pages/Dashboard/AllTicketsPage";
import TicketDetailPage from "./pages/Dashboard/TicketDetailPage";
import EditTicketPage from "./pages/Dashboard/EditTicketPage";
import UsersPage from "./pages/Dashboard/UsersPage";
import UserDetailPage from "./pages/Dashboard/UserDetailPage";
import RolesManagementPage from "./pages/Dashboard/RolesManagementPage";
import AuditLogsPage from "./pages/Dashboard/AuditLogsPage";
import SystemSettingsPage from "./pages/Dashboard/SystemSettingsPage";
import ReportsPage from "./pages/Dashboard/ReportsPage";
import NotificationsPage from "./pages/Dashboard/NotificationsPage";

// ✅ Invite management pages
import InviteUserPage from "./pages/Dashboard/InviteUserPage";
import InvitesListPage from "./pages/Dashboard/InvitesListPage"; // Optional page to list all invites

export default function App() {
  const { user } = useAuthStore();

  // 🔓 Default redirect: always push logged-in users to main dashboard
  const getDefaultDashboard = () => {
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to="/dashboard/main" replace />;
  };

  return (
    <BrowserRouter>
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

        {/* Public authentication routes */}
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

        {/* 🔒 Protected area */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard default */}
          <Route path="dashboard" element={getDefaultDashboard()} />

          {/* 🚪 Feature pages */}
          <Route
            path="dashboard/submit-ticket"
            element={<SubmitTicketPage />}
          />
          <Route path="dashboard/my-tickets" element={<MyTicketsPage />} />
          <Route
            path="dashboard/assigned-tickets"
            element={<AssignedTicketsPage />}
          />
          <Route
            path="dashboard/my-assigned-tickets"
            element={<FixerAssignedTicketsPage />}
          />
          <Route path="dashboard/main" element={<AdminDashboardPage />} />
          <Route path="dashboard/tickets" element={<AllTicketsPage />} />
          <Route path="dashboard/tickets/:id" element={<TicketDetailPage />} />
          <Route
            path="dashboard/tickets/:id/edit"
            element={<EditTicketPage />}
          />
          <Route path="dashboard/users" element={<UsersPage />} />
          <Route path="dashboard/users/:id" element={<UserDetailPage />} />
          <Route path="dashboard/roles" element={<RolesManagementPage />} />
          <Route path="dashboard/audit-logs" element={<AuditLogsPage />} />
          <Route path="dashboard/settings" element={<SystemSettingsPage />} />
          <Route path="dashboard/reports" element={<ReportsPage />} />
          <Route
            path="dashboard/notifications"
            element={<NotificationsPage />}
          />

          {/* ✅ Invite management routes */}
          <Route path="dashboard/invite" element={<InviteUserPage />} />
          <Route path="dashboard/invites" element={<InvitesListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
