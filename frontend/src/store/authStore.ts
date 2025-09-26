import { create } from "zustand";
import {
  login as loginApi,
  logout as logoutApi,
  getProfile,
} from "../api/auth";

// 🔹 Full User type based on backend UserProfileView response
interface User {
  id: number;
  email: string;
  role: string;
  is_email_verified: boolean;
  features: string[];
  allowed_categories: string[];
  student_profile?: {
    full_name: string;
    course: string;
    year_level: number;
    student_id: string;
  } | null;
}

interface AuthState {
  user: User | null;
  access: string | null;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  access: localStorage.getItem("access"),
  loading: false,
  error: null,

  // 🔹 Login
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await loginApi(email, password);

      // Save access token
      localStorage.setItem("access", data.access);
      set({ access: data.access });

      // Fetch user profile after login
      await useAuthStore.getState().fetchProfile();
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Login failed" });
    } finally {
      set({ loading: false });
    }
  },

  // 🔹 Load user profile (called on app init or after login)
  fetchProfile: async () => {
    try {
      const profile = await getProfile();
      set({ user: profile });
    } catch {
      // If fetch fails, clear session
      localStorage.removeItem("access");
      set({ user: null, access: null });
    }
  },

  // 🔹 Logout
  logout: async () => {
    try {
      await logoutApi();
    } finally {
      localStorage.removeItem("access");
      set({ user: null, access: null });
    }
  },
}));
