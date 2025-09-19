import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  getAccessToken,
  getProfileFromStorage,
  fetchProfileAndSave,
} from "../utils/auth";

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function ensureAuth() {
      const access = getAccessToken();
      if (!access) {
        if (mounted) {
          setAuthorized(false);
          setLoading(false);
        }
        return;
      }

      const storedProfile = getProfileFromStorage();
      if (storedProfile) {
        if (mounted) {
          setAuthorized(true);
          setLoading(false);
        }
        return;
      }

      try {
        await fetchProfileAndSave();
        if (mounted) setAuthorized(true);
      } catch (err) {
        console.error("fetchProfile failed", err);
        if (mounted) setAuthorized(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    ensureAuth();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!authorized) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
