import { apiClient } from '@/shared/api/rest';
import { UserProfileResponse } from './types';

export const userApi = {
  getProfile: async (): Promise<UserProfileResponse> => {
    const { data } = await apiClient.get('/users/me');
    return data;
  },
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken });
  }
};