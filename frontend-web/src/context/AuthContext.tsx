// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  ACCESS_KEY,
  PROFILE_KEY,
  saveTokens,
  logoutAndClear,
  refreshAccessToken as refreshHelper,
  type UserProfile,
} from "../utils/auth";

export interface AuthContextType {
  accessToken: string | null;
  profile: UserProfile | null;
  login: (token: string, profile?: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  sessionExpired: boolean;
  setSessionExpired: (expired: boolean) => void; // ✅ expose setter
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_KEY)
  );
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  });
  const [sessionExpired, setSessionExpired] = useState(false);

  const login = async (token: string, userProfile?: UserProfile) => {
    setAccessToken(token);
    saveTokens({ access: token });
    if (userProfile) {
      setProfile(userProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(userProfile));
    }
    setSessionExpired(false);
  };

  const logout = async () => {
    setAccessToken(null);
    setProfile(null);
    localStorage.removeItem(PROFILE_KEY);
    await logoutAndClear();
    setSessionExpired(true);
  };

  const refreshAccessToken = async () => {
    const newAccess = await refreshHelper();
    if (newAccess) {
      setAccessToken(newAccess);
      saveTokens({ access: newAccess });
      setSessionExpired(false);
    } else {
      await logout();
    }
  };

  // 🔄 Auto-refresh every 25 minutes
  useEffect(() => {
    const interval = setInterval(refreshAccessToken, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🪝 Sync across browser tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACCESS_KEY || e.key === PROFILE_KEY || e.key === null) {
        if (!localStorage.getItem(ACCESS_KEY)) {
          setAccessToken(null);
          setProfile(null);
          setSessionExpired(true);
        } else {
          const raw = localStorage.getItem(PROFILE_KEY);
          setProfile(raw ? (JSON.parse(raw) as UserProfile) : null);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        profile,
        login,
        logout,
        refreshAccessToken,
        sessionExpired,
        setSessionExpired, // ✅ now available
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
