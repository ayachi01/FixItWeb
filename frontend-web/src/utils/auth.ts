export const ACCESS_KEY = "access";
export const REFRESH_KEY = "refresh";
export const PROFILE_KEY = "profile";

// ✅ Make sure UserProfile is exported
export interface UserProfile {
  id: number;
  email: string;
  role: string;
  can_report: boolean;
  can_fix: boolean;
  can_assign: boolean;
  is_email_verified: boolean;
  email_domain: string;
  // add any other fields returned by your backend
}

// ✅ Tokens
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function saveTokens(tokens: { access?: string; refresh?: string }) {
  if (tokens.access) localStorage.setItem(ACCESS_KEY, tokens.access);
  if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

// ✅ Profile
export function saveProfile(profileObj: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profileObj));
}

export function getProfileFromStorage(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as UserProfile) : null;
}

export async function fetchProfileAndSave(): Promise<UserProfile> {
  const access = getAccessToken();
  if (!access) throw new Error("No token found");

  const res = await fetch("http://127.0.0.1:8000/api/profile/", {
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) throw new Error("Failed to fetch profile");

  const data: UserProfile = await res.json();
  saveProfile(data);
  return data;
}

// ✅ Logout
export function logoutAndClear() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(PROFILE_KEY);
}
