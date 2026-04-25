import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // токен будет подставляться логикой Zustand в модуле Auth
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // логика refresh-токена будет добавлена на этапе модуля Auth
    return Promise.reject(error);
  }
);