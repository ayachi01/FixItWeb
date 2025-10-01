// src/App.tsx
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
import ReportTicketPage from "./pages/ReportTicketPage";
import AssignedTicketsPage from "./pages/AssignedTicketsPage";
import MyReportsPage from "./pages/MyReportsPage";

// Admin Pages
import AdminDashboardPage from "./pages/admin/Dashboard";
import TicketsPage from "./pages/admin/TicketsPage";
import TicketDetailPage from "./pages/admin/TicketDetailPage";
import UsersPage from "./pages/admin/UsersPage";
import UserDetailPage from "./pages/admin/UserDetailPage";
import RolesPage from "./pages/admin/RolesPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import SettingsPage from "./pages/admin/SettingsPage";

// Simple dashboards
function StudentDashboard() {
  return <h1>🎓 Student Dashboard (Report Ticket)</h1>;
}
function StaffDashboard() {
  return <h1>👷 Staff Dashboard</h1>;
}

export default function App() {
  const { user } = useAuthStore();

  // 🔹 Decide default dashboard redirect
  const getDashboard = () => {
    if (!user) return <Navigate to="/login" replace />;

    // ✅ Ensure roleName is always a string
    const roleName = user?.role?.name?.toLowerCase() || "";

    if (
      roleName === "admin" ||
      roleName === "super admin" ||
      roleName === "university admin"
    ) {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (roleName.includes("staff")) {
      return <StaffDashboard />;
    }

    return <StudentDashboard />;
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Redirect root based on auth */}
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

        {/* Protected with Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Default dashboards */}
          <Route path="dashboard" element={getDashboard()} />

          {/* Student/Staff routes */}
          <Route path="tickets" element={<MyReportsPage />} />
          <Route path="report-ticket" element={<ReportTicketPage />} />
          <Route path="my-reports" element={<MyReportsPage />} />
          <Route path="assigned-tickets" element={<AssignedTicketsPage />} />

          {/* 🔹 Admin routes */}
          <Route path="admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="admin/tickets" element={<TicketsPage />} />
          <Route path="admin/tickets/:id" element={<TicketDetailPage />} />
          <Route path="admin/users" element={<UsersPage />} />
          <Route path="admin/users/:id" element={<UserDetailPage />} />
          <Route path="admin/roles" element={<RolesPage />} />
          <Route path="admin/audit-logs" element={<AuditLogsPage />} />
          <Route path="admin/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
