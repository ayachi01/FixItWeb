// src/routes/PrivateRoute.tsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { accessToken, refreshAccessToken, sessionExpired } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function ensureAuth() {
      try {
        if (!accessToken) {
          // 🔄 Try restoring session from refresh cookie
          await refreshAccessToken();
        }
        if (mounted) {
          setAuthorized(true);
        }
      } catch (err) {
        console.error("❌ Auth check failed:", err);
        if (mounted) {
          setAuthorized(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    ensureAuth();

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

  // ✅ Show Session Expired UI
  if (sessionExpired) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded shadow-md text-center">
          <h2 className="text-xl font-semibold mb-2">⚠️ Session Expired</h2>
          <p className="text-gray-600 mb-4">
            Your session has expired. Please log in again to continue.
          </p>
          <a
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Re-Login
          </a>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
