import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, access } = useAuthStore();

  if (!access || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
