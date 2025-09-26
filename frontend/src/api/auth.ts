import { api } from "./index";

// 🔹 Login → POST /api/auth/login/
export async function login(email: string, password: string) {
  const res = await api.post("/auth/login/", { email, password });
  localStorage.setItem("access", res.data.access);
  return res.data;
}

// 🔹 Register (optional: if you add a view for it)
export async function register(email: string, password: string, role: string) {
  return api.post("/users/", { email, password, role });
  // ✅ using DRF /users/ endpoint for now
}

// 🔹 Profile → GET /api/auth/profile/
export async function getProfile() {
  const res = await api.get("/auth/profile/");
  return res.data;
}

// 🔹 Logout → POST /api/auth/logout/
export async function logout() {
  await api.post("/auth/logout/");
  localStorage.removeItem("access");
}
