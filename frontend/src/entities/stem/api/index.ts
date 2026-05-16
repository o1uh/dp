import { apiClient } from '@/shared/api/rest';

export const stemApi = {
  updateVisibility: async (id: string, visibility: 'private' | 'public' | 'unlisted'): Promise<void> => {
    await apiClient.put(`/stems/${id}/visibility`, { visibility });
  },
  getDownloadUrl: async (id: string): Promise<string> => {
    const { data } = await apiClient.get(`/stems/${id}/download`);
    return data.download_url;
  }
};