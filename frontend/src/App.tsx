// 📂 src/App.tsx
import React from "react"; // ✅ Required for JSX.Element type
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuthStore } from "./store/authStore";

// 🔑 Authentication Pages (public - before login)
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const ForgotPasswordChoice = lazy(
  () => import("./pages/Auth/ForgotPasswordChoice")
);
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPasswordEmail"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
const ForgotPasswordOTP = lazy(() => import("./pages/Auth/ForgotPasswordOTP"));
const VerifyEmailPage = lazy(() => import("./pages/Auth/VerifyEmailPage"));
const InviteRegisterPage = lazy(
  () => import("./pages/Dashboard/InviteRegisterPage")
);

// 🏠 Public landing page (for visitors before login)
const HomePage = lazy(() => import("./pages/Dashboard/HomePage"));

// 🔒 Layout wrapper (only checks if user is logged in)
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const Layout = lazy(() => import("./components/Dashboard/DashboardLayout"));

// 📊 Dashboard Pages (all accessible once logged in)
const SubmitTicketPage = lazy(
  () => import("./pages/Dashboard/SubmitTicketPage")
);
const AssignedTicketsPage = lazy(
  () => import("./pages/Dashboard/MyUnassignTicketsPage")
);
const MyTicketsPage = lazy(() => import("./pages/Dashboard/MyTicketsPage"));
const FixerAssignedTicketsPage = lazy(
  () => import("./pages/Dashboard/MyAssignedTicketsPage")
);
const AdminDashboardPage = lazy(
  () => import("./pages/Dashboard/DashboardPage")
);
const AllTicketsPage = lazy(() => import("./pages/Dashboard/AllTicketsPage"));
const TicketDetailPage = lazy(
  () => import("./pages/Dashboard/TicketDetailPage")
);
const EditTicketPage = lazy(() => import("./pages/Dashboard/EditTicketPage"));
const UsersPage = lazy(() => import("./pages/Dashboard/UsersPage"));
const UserDetailPage = lazy(() => import("./pages/Dashboard/UserDetailPage"));
const RolesManagementPage = lazy(
  () => import("./pages/Dashboard/RolesManagementPage")
);
const AuditLogsPage = lazy(() => import("./pages/Dashboard/AuditLogsPage"));
const SystemSettingsPage = lazy(
  () => import("./pages/Dashboard/SystemSettingsPage")
);
const ReportsPage = lazy(() => import("./pages/Dashboard/ReportsPage"));
const NotificationsPage = lazy(
  () => import("./pages/Dashboard/NotificationsPage")
);

// ✅ Invite management pages
const InviteUserPage = lazy(() => import("./pages/Dashboard/InviteUserPage"));
const InvitesListPage = lazy(() => import("./pages/Dashboard/InvitesListPage"));

// 🔹 Utility to wrap a page with role-based protection
function RoleProtected({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactElement; // ✅ Fixed JSX namespace error
}) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>
  );
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
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

            {/* Users management restricted by role */}
            <Route
              path="users"
              element={
                <RoleProtected
                  allowedRoles={["HR", "Registrar", "University Admin"]}
                >
                  <UsersPage />
                </RoleProtected>
              }
            />
            <Route
              path="users/:id"
              element={
                <RoleProtected
                  allowedRoles={["HR", "Registrar", "University Admin"]}
                >
                  <UserDetailPage />
                </RoleProtected>
              }
            />

            {/* Roles management restricted to admins */}
            <Route
              path="roles"
              element={
                <RoleProtected
                  allowedRoles={["HR", "Registrar", "University Admin"]}
                >
                  <RolesManagementPage />
                </RoleProtected>
              }
            />

            {/* Audit logs restricted to admins */}
            <Route
              path="audit-logs"
              element={
                <RoleProtected
                  allowedRoles={["HR", "Registrar", "University Admin"]}
                >
                  <AuditLogsPage />
                </RoleProtected>
              }
            />

            {/* System settings restricted to University Admin */}
            <Route
              path="settings"
              element={
                <RoleProtected allowedRoles={["University Admin"]}>
                  <SystemSettingsPage />
                </RoleProtected>
              }
            />

            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="invite" element={<InviteUserPage />} />
            <Route path="invites" element={<InvitesListPage />} />
          </Route>

          {/* Catch-all for unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
