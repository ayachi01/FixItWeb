// src/utils/auth.ts
export const ACCESS_KEY = "access";
export const REFRESH_KEY = "refresh";
export const PROFILE_KEY = "profile";

// ✅ UserProfile matches backend serializer fields
export interface UserProfile {
  id: number;
  email: string;
  role: string;
  can_report: boolean;
  can_fix: boolean;
  can_assign: boolean;
  is_email_verified: boolean;
  email_domain: string;
  // extend if backend returns more
}

// ==================== Tokens ====================

// ✅ Get stored access token
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

// ✅ Save tokens safely
export function saveTokens(tokens: { access?: string; refresh?: string }) {
  if (tokens.access) localStorage.setItem(ACCESS_KEY, tokens.access);
  if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

// ✅ Save access only
export function saveAccessToken(access: string) {
  localStorage.setItem(ACCESS_KEY, access);
}

// ==================== Profile ====================

// ✅ Save profile
export function saveProfile(profileObj: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profileObj));
}

// ✅ Load profile
export function getProfileFromStorage(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

// ==================== Refresh Helper ====================

// ✅ Refresh access token using HttpOnly refresh cookie
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
      method: "POST",
      credentials: "include", // send HttpOnly refresh cookie
    });

    if (!res.ok) {
      console.warn("⚠️ Refresh failed with status", res.status);
      return null;
    }

    const data = await res.json();
    if (data.access) {
      saveAccessToken(data.access);
      return data.access;
    }
    return null;
  } catch (err) {
    console.error("Refresh request failed:", err);
    return null;
  }
}

// ==================== Profile Fetch ====================

// ✅ Fetch profile from backend + persist
export async function fetchProfileAndSave(): Promise<UserProfile> {
  let access = getAccessToken();

  if (!access) {
    // try to refresh if no token
    access = await refreshAccessToken();
    if (!access) {
      throw new Error("session_expired");
    }
  }

  let res = await fetch("http://127.0.0.1:8000/api/profile/", {
    method: "GET",
    headers: { Authorization: `Bearer ${access}` },
    credentials: "include",
  });

  if (res.status === 401) {
    // token expired → try refresh once
    access = await refreshAccessToken();
    if (!access) {
      throw new Error("session_expired");
    }

    res = await fetch("http://127.0.0.1:8000/api/profile/", {
      method: "GET",
      headers: { Authorization: `Bearer ${access}` },
      credentials: "include",
    });
  }

  if (!res.ok) {
    throw new Error("session_expired");
  }

  const data: UserProfile = await res.json();
  saveProfile(data);
  return data;
}

// ==================== Logout ====================

// ✅ Clear all stored auth info + call backend logout
export async function logoutAndClear() {
  // Clear local storage
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(PROFILE_KEY);

  try {
    // ⚠️ Backend must expose this endpoint to clear refresh cookie
    const res = await fetch("http://127.0.0.1:8000/api/logout/", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      console.warn("⚠️ Server logout failed with status", res.status);
    }
  } catch (err) {
    console.warn("Logout request failed:", err);
  }
}
