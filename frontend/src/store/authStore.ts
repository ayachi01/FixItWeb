// 📂 src/store/authStore.ts
import { create } from "zustand";
import {
  login as loginApi,
  logout as logoutApi,
  getProfile,
} from "../api/auth";

// 🔹 Role type from backend
export interface Role {
  id: number | null;
  name: string | null;
  description: string | null;
}

// 🔹 Full User type based on backend UserProfileView response
export interface User {
  id: number;
  email: string;
  role: Role;
  is_email_verified: boolean;
  features: string[];
  allowed_categories: string[];
  student_profile?: {
    full_name: string;
    course: string;
    year_level: number;
    student_id: string;
  } | null;
  roleName?: string; // ✅ normalized string for convenience
}

interface AuthState {
  user: User | null;
  access: string | null; // JWT token
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  access: localStorage.getItem("access_token"),
  loading: false,
  error: null,

  // 🔹 Login
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await loginApi(email, password);

      // Save access token
      localStorage.setItem("access_token", data.access);
      set({ access: data.access });

      // Fetch user profile after login
      await useAuthStore.getState().fetchProfile();

      // ✅ Check email verification immediately
      const currentUser = useAuthStore.getState().user;
      if (currentUser && !currentUser.is_email_verified) {
        throw new Error("Please verify your email before logging in.");
      }
    } catch (err: any) {
      set({
        error: err.message || err.response?.data?.detail || "Login failed",
      });
    } finally {
      set({ loading: false });
    }
  },

  // 🔹 Load user profile (called on app init or after login)
  fetchProfile: async () => {
    try {
      const profile = await getProfile();

      // ✅ Normalize role: ensure it's always a Role object
      const normalizedRole: Role =
        typeof profile.role === "string"
          ? { id: null, name: profile.role, description: null }
          : profile.role;

      const normalizedProfile: User = {
        ...profile,
        role: normalizedRole,
        roleName: normalizedRole?.name?.toLowerCase() || "",
      };

      // Save to state + storage
      set({ user: normalizedProfile });
      localStorage.setItem("user", JSON.stringify(normalizedProfile));
    } catch {
      // If fetch fails, clear session
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      set({ user: null, access: null });
    }
  },

  // 🔹 Logout
  logout: async () => {
    try {
      await logoutApi();
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      set({ user: null, access: null });
    }
  },

  // 🔹 Restore session (used on app init)
  restoreSession: () => {
    const token = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      set({
        access: token,
        user: JSON.parse(storedUser),
      });
    }
  },
}));
