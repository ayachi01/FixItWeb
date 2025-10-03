// ✅ Type-only import
import type { User } from "../store/authStore";
import { useAuthStore } from "../store/authStore";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: (keyof User["permissions"])[]; // Permissions needed to access
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
}: ProtectedRouteProps) {
  const { user, access } = useAuthStore();

  // 🔹 Not logged in
  if (!access || !user) return <Navigate to="/login" replace />;

  // 🔹 Check permissions
  const hasAccess = requiredPermissions.every(
    (perm) => user.permissions[perm] === true
  );

  // 🔹 Insufficient permissions
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  // 🔹 Authorized
  return <>{children}</>;
}
