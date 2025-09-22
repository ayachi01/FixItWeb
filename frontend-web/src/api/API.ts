// src/api/API.ts
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from "axios";

// ✅ Extend AxiosInstance to support generic return typing
interface TypedAxiosInstance extends AxiosInstance {
  get<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  post<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  put<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  patch<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  delete<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
}

export function useAPI() {
  const { accessToken, refreshAccessToken, logout } = useAuth();

  const API: TypedAxiosInstance = axios.create({
    baseURL: "http://127.0.0.1:8000/api",
    withCredentials: true, // ✅ include cookies for refresh token
  }) as TypedAxiosInstance;

  // ✅ Attach access token only to private endpoints
  API.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const publicPaths = new Set([
      "/users/register_self_service/",
      "/users/verify_otp/",
      "/users/resend_otp/",
      "/token/", // login
      "/token/refresh/", // refresh
    ]);

    // Normalize the path
    const urlPath = new URL(config.url ?? "", config.baseURL).pathname;
    const isPublic = publicPaths.has(urlPath);

    // Ensure headers is an AxiosHeaders instance
    const headers = config.headers as AxiosHeaders;

    if (isPublic) {
      headers.delete("Authorization");
    } else if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    // 🔍 Debugging (only in development)
    if (import.meta.env.DEV) {
      console.log(
        `[API] ${isPublic ? "Public" : "Private"} request → ${urlPath}`,
        headers.toJSON()
      );
    }

    return config;
  });

  // ✅ Auto refresh token on 401 and retry once
  API.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/token/")
      ) {
        originalRequest._retry = true;

        try {
          // 🔄 Refresh access token using cookies
          await refreshAccessToken();

          // ✅ Grab the new access token from localStorage
          const newToken = localStorage.getItem("accessToken");

          if (newToken && originalRequest.headers) {
            (originalRequest.headers as AxiosHeaders).set(
              "Authorization",
              `Bearer ${newToken}`
            );
          }

          // 🔁 Retry the failed request with new token
          return API(originalRequest);
        } catch (err) {
          // ❌ If refresh fails → clear stale token + logout
          localStorage.removeItem("accessToken");
          logout();
          return Promise.reject(err);
        }
      }

      return Promise.reject(error);
    }
  );

  return API;
}
