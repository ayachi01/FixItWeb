import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api", // ✅ Django backend prefix
  withCredentials: true, // ✅ cookies for refresh/logout
});

// 🔹 Request interceptor → attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔹 Response interceptor → auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // ✅ match Django refresh path
        const res = await api.post("/token/refresh/");

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        // ✅ update header & retry original request
        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        // ❌ refresh failed → log out
        localStorage.removeItem("access");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
