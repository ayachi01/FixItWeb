// src/api/auth.ts
import { api } from "./client";

// 🔹 Login → POST /api/auth/login/
export async function login(email: string, password: string) {
  const res = await api.post("/auth/login/", { email, password });
  localStorage.setItem("access", res.data.access);
  return res.data;
}

// 🔹 Register → POST /api/auth/register/
export async function register(
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  confirm_password: string
) {
  const res = await api.post("/auth/register/", {
    first_name,
    last_name,
    email,
    password,
    confirm_password,
  });
  return res.data;
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
