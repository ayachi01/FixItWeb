// src/routes/ProtectedRoute.tsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const {
    accessToken,
    refreshAccessToken,
    sessionExpired,
    logout,
    setSessionExpired,
  } = useAuth();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        if (!accessToken) {
          // 🔄 Try restoring access token from refresh cookie
          await refreshAccessToken();
        }
      } catch (err) {
        console.error("❌ Auth check failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [accessToken, refreshAccessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-gray-600 animate-pulse">Checking session...</span>
      </div>
    );
  }

  // ✅ Unified Session Expired UI
  if (sessionExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-sm text-center">
          <h2 className="text-xl font-bold mb-2 text-red-600">
            ⚠️ Session Expired
          </h2>
          <p className="text-gray-600 mb-4">
            Your session has expired. Please log in again to continue.
          </p>
          <button
            onClick={async () => {
              await logout();
              setSessionExpired(false); // reset flag after logout
              window.location.href = "/login";
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Re-login
          </button>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
