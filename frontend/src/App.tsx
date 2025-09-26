import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { useAuthStore } from "./store/authStore";

// Pages
function StudentDashboard() {
  return <h1>🎓 Student Dashboard (Report Ticket)</h1>;
}
function AdminDashboard() {
  return <h1>🛠️ Admin Dashboard (Manage Tickets)</h1>;
}
function StaffDashboard() {
  return <h1>👷 Staff Dashboard</h1>;
}
function TicketsPage() {
  return <h1>📄 Tickets Page</h1>;
}
function UsersPage() {
  return <h1>👥 Manage Users</h1>;
}
function SettingsPage() {
  return <h1>⚙️ System Settings</h1>;
}

export default function App() {
  const { user } = useAuthStore();

  const getDashboard = () => {
    if (!user) return <Navigate to="/login" replace />;
    switch (user.role.toLowerCase()) {
      case "admin":
      case "super admin":
      case "university admin":
        return <AdminDashboard />;
      case "staff":
        return <StaffDashboard />;
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* redirect / → /dashboard if logged in, else → /login */}
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

        {/* Protected + Sidebar Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <></>
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={getDashboard()} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
