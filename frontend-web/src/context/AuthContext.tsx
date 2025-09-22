// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  ACCESS_KEY,
  PROFILE_KEY,
  saveTokens,
  logoutAndClear,
  refreshAccessToken as refreshHelper,
} from "../utils/auth";

interface AuthContextType {
  accessToken: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  sessionExpired: boolean;
  setSessionExpired: (expired: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem(ACCESS_KEY) // ✅ restore from localStorage
  );
  const [sessionExpired, setSessionExpired] = useState(false);

  // 🔹 Login → save access token (backend sets refresh cookie)
  const login = async (token: string) => {
    setAccessToken(token);
    saveTokens({ access: token });
    setSessionExpired(false); // reset on login
  };

  // 🔹 Logout → clear local + server refresh cookie
  const logout = async () => {
    setAccessToken(null);
    localStorage.removeItem(PROFILE_KEY); // ✅ clear profile explicitly
    await logoutAndClear();
  };

  // 🔹 Refresh access token using cookie (delegates to utils/auth.ts)
  const refreshAccessToken = async () => {
    try {
      const newAccess = await refreshHelper();
      if (newAccess) {
        setAccessToken(newAccess);
        saveTokens({ access: newAccess });
        setSessionExpired(false);
      } else {
        throw new Error("No access token returned");
      }
    } catch (err: any) {
      console.error("Token refresh error", err);
      setSessionExpired(true); // ✅ mark expired
      await logout(); // force logout if refresh fails
      throw err;
    }
  };

  // 🔹 Auto-refresh token every 25 minutes (before expiry)
  useEffect(() => {
    const interval = setInterval(refreshAccessToken, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔹 Listen for logout/session-expiry across tabs
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key === ACCESS_KEY ||
        event.key === PROFILE_KEY ||
        event.key === null // clear all storage
      ) {
        if (!localStorage.getItem(ACCESS_KEY)) {
          setAccessToken(null);
          setSessionExpired(true);
        }
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        login,
        logout,
        refreshAccessToken,
        sessionExpired,
        setSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
