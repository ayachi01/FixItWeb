import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../api";
import axios from "axios";

export function useAuth() {
  const { user, access, logout } = useAuthStore();
  const setState = useAuthStore.setState;

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("access");

      if (token && !user) {
        try {
          const res = await api.get("/profile/");
          setState({ user: res.data, access: token });
        } catch (err: any) {
          console.error("Failed to restore session", err);
          logout();
        }
      }
    };

    fetchProfile();
  }, [user, logout, setState]);

  // ✅ Axios interceptor for auto-refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 & not retried yet → try refresh
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url.includes("/token/")
        ) {
          originalRequest._retry = true;
          try {
            const res = await axios.post(
              "http://127.0.0.1:8000/api/token/refresh/",
              {},
              { withCredentials: true } // 🔑 refresh token is in HttpOnly cookie
            );

            const newAccess = res.data.access;
            localStorage.setItem("access", newAccess);
            setState({ access: newAccess });

            // Attach new token + retry request
            originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
            return api(originalRequest);
          } catch (refreshError) {
            console.error("Token refresh failed", refreshError);
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [logout, setState]);

  return { user, access, logout };
}
