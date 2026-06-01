import axios from 'axios';
import { useUserStore } from '@/entities/user/model/store';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useUserStore.getState().accessToken;
  console.log(`[API CLIENT REQUEST] Intercepting request to path: ${config.url}. Token present in store: ${!!token}`);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API CLIENT REQUEST] Attached Authorization Bearer token to request: ${config.url}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API CLIENT RESPONSE] Success. Path: ${response.config.url}, Status: ${response.status}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error(`[API CLIENT RESPONSE ERROR] Catch block active. Path: ${originalRequest?.url}, Status: ${error.response?.status}`);

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log(`[API CLIENT RESPONSE ERROR] 401 Unauthorized detected on path: ${originalRequest.url}. Retrying request with token rotation...`);
      originalRequest._retry = true;
      try {
        const refreshToken = useUserStore.getState().refreshToken;
        console.log(`[API CLIENT REFRESH] Fetching refresh token from localStorage: ${!!refreshToken}`);
        if (!refreshToken) {
          console.error('[API CLIENT REFRESH] Aborted: No refresh token exists in user store');
          throw new Error('No refresh token');
        }

        console.log('[API CLIENT REFRESH] Dispatching credentials rotation request to API /auth/refresh...');
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        console.log('[API CLIENT REFRESH] Credentials rotation success. Saving new tokens to store...');
        useUserStore.getState().setTokens(data.access_token, data.refresh_token);
        
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        console.log(`[API CLIENT REFRESH] Retrying original request to path: ${originalRequest.url}`);
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[API CLIENT REFRESH ERROR] Credentials rotation failed. Clearing session state...', refreshError);
        useUserStore.getState().logout();
        if (typeof window !== 'undefined') {
          console.warn('[API CLIENT REDIRECT] Forcing browser redirection to /login path');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);