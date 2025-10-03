import { create } from "zustand";
import {
  login as loginApi,
  logout as logoutApi,
  getProfile,
} from "../api/auth";

// Role type
export interface Role {
  id: number | null;
  name: string | null;
  description: string | null;
}

// Permissions type
export interface Permissions {
  can_report: boolean;
  can_fix: boolean;
  can_assign: boolean;
  can_manage_users: boolean;
  is_admin_level: boolean;
  allowed_categories: string[];
}

// Full user type
export interface User {
  id: number;
  email: string;
  role: Role;
  is_email_verified: boolean;
  features: string[];
  permissions: Permissions;
  student_profile?: {
    full_name: string;
    course: string;
    year_level: number;
    student_id: string;
  } | null;
  roleName?: string;
}

interface AuthState {
  user: User | null;
  access: string | null;
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

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await loginApi(email, password);
      localStorage.setItem("access_token", data.access);
      set({ access: data.access });
      await useAuthStore.getState().fetchProfile();
      const currentUser = useAuthStore.getState().user;
      if (currentUser && !currentUser.is_email_verified) {
        throw new Error("Please verify your email before logging in.");
      }
    } catch (err: any) {
      set({ error: err.message || "Login failed" });
    } finally {
      set({ loading: false });
    }
  },

  fetchProfile: async () => {
    try {
      const profile = await getProfile();
      const normalizedRole: Role =
        typeof profile.role === "string"
          ? { id: null, name: profile.role, description: null }
          : profile.role;

      const normalizedPermissions: Permissions = {
        can_report: profile.features?.includes("canReport") ?? false,
        can_fix: profile.can_fix ?? false,
        can_assign: profile.can_assign ?? false,
        can_manage_users: profile.can_manage_users ?? false,
        is_admin_level: profile.is_admin_level ?? false,
        allowed_categories: profile.allowed_categories || [],
      };

      const normalizedProfile: User = {
        ...profile,
        role: normalizedRole,
        roleName: normalizedRole?.name?.toLowerCase() || "",
        permissions: normalizedPermissions,
      };

      set({ user: normalizedProfile });
      localStorage.setItem("user", JSON.stringify(normalizedProfile));
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      set({ user: null, access: null });
    }
  },

  logout: async () => {
    try {
      await logoutApi();
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      set({ user: null, access: null });
    }
  },

  restoreSession: () => {
    const token = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const normalizedPermissions: Permissions = {
        can_report: parsedUser.permissions?.can_report ?? false,
        can_fix: parsedUser.permissions?.can_fix ?? false,
        can_assign: parsedUser.permissions?.can_assign ?? false,
        can_manage_users: parsedUser.permissions?.can_manage_users ?? false,
        is_admin_level: parsedUser.permissions?.is_admin_level ?? false,
        allowed_categories: parsedUser.permissions?.allowed_categories || [],
      };
      set({
        access: token,
        user: { ...parsedUser, permissions: normalizedPermissions },
      });
    }
  },
}));
