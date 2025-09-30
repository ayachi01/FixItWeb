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

// ======================================
// 🔐 Password Reset via OTP
// ======================================

// 1️⃣ Request password reset → sends code to email
export async function requestPasswordReset(email: string) {
  const res = await api.post("/auth/forgot-password-otp/", { email });
  return res.data; // { message: "Password reset code sent" }
}

// 2️⃣ Confirm password reset → verifies code and sets new password
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
) {
  const res = await api.post("/auth/reset-password-otp/", {
    email,
    code,
    new_password: newPassword, // must match backend field name
  });
  return res.data; // { message: "Password has been reset successfully" }
}
