// src/api/client.ts
import axios from "axios";

// ✅ Axios instance with Django backend base URL
export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api", // adjust if backend is on different host/port
  withCredentials: true, // include cookies if using session auth
});

// 🔹 Request interceptor → attach access token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("🔹 Axios Request:", {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error("❌ Axios request error:", error);
    return Promise.reject(error);
  }
);

// 🔹 Response interceptor → auto-refresh token on 401 (optional)
api.interceptors.response.use(
  (response) => {
    console.log("✅ Axios Response:", {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error("❌ Axios Response error:", {
      url: originalRequest?.url,
      status: error.response?.status,
      data: error.response?.data,
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await api.post("/token/refresh/");
        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);
        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
