// src/routes/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { accessToken, sessionExpired, logout, setSessionExpired } = useAuth();

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
              setSessionExpired(false);
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

  return children;
}
