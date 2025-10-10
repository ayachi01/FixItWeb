// 📂 src/components/ProtectedRoute.tsx
// ✅ Type-only import
import type { User } from "../store/authStore";
import { useAuthStore } from "../store/authStore";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: (keyof User["permissions"])[]; // Permissions needed to access
  allowedRoles?: string[]; // Roles allowed to access (case-insensitive)
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  allowedRoles = [],
}: ProtectedRouteProps) {
  const { user, access, loading } = useAuthStore(); // Optional: add loading if auth is async

  // 🔹 Show loading state while auth is initializing
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  // 🔹 Not logged in
  if (!access || !user) return <Navigate to="/login" replace />;

  // 🔹 Check permissions
  const hasPermissions =
    requiredPermissions.length === 0 ||
    requiredPermissions.every((perm) => user.permissions[perm] === true);

  // 🔹 Check allowed roles
  const hasRole =
    allowedRoles.length === 0 ||
    allowedRoles.some(
      (role) => role.toLowerCase() === user.roleName?.toLowerCase()
    );

  // 🔹 Insufficient permissions or role
  if (!hasPermissions || !hasRole) return <Navigate to="/dashboard" replace />;

  // 🔹 Authorized
  return <>{children}</>;
}
