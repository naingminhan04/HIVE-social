import { getToken } from "@/app/_actions/cookies";
import { API_BASE_URL } from "@/libs/apiBase";
import axios from "axios";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (!token) {
    // Set default Content-Type for non-FormData requests
    if (!(config.data instanceof FormData) && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  }

  config.headers.Authorization = `Bearer ${token}`;
  
  // For FormData, explicitly remove Content-Type so axios sets it with boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    // Only set Content-Type for non-FormData requests
    config.headers["Content-Type"] = "application/json";
  }
  
  return config;
});

// Response interceptor to handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const requestUrl = String(originalRequest?.url ?? "");
    const isAuthRefreshRequest = requestUrl.includes("/auth/refresh-token");

    // If error is 401 and we haven't tried to refresh yet
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRefreshRequest
    ) {
      originalRequest._retry = true;

      try {
        // Dynamically import to avoid circular dependencies
        const { refreshAction } = await import("@/app/_actions/refresh");
        const result = await refreshAction();

        if (result.success && result.data.accessToken) {
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${result.data.accessToken}`;
          return api(originalRequest);
        } else {
          // Refresh failed - clear auth state and redirect to login
          const { clearAuthCookies } = await import("@/app/_actions/cookies");
          await clearAuthCookies();
          
          // Redirect to login in the browser
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          
          return Promise.reject(new Error('Session expired. Please login again.'));
        }
      } catch (refreshError) {
        // If refresh fails, clear cookies and reject
        const { clearAuthCookies } = await import("@/app/_actions/cookies");
        await clearAuthCookies();
        
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
