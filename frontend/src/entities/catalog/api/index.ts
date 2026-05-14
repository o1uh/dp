import { apiClient } from '@/shared/api/rest';
import { PaginatedResponse } from '@/shared/api/types';
import { Track } from '@/entities/track/api';

export const catalogApi = {
  search: async (params: { q?: string; genre?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Track>> => {
    const { data } = await apiClient.get('/catalog/search', { params });
    return data;
  },
  saveAlias: async (originalId: string): Promise<void> => {
    await apiClient.post('/tracks/save-alias', { original_id: originalId });
  },
  registerPlay: async (trackId: string): Promise<void> => {
    await apiClient.post(`/catalog/${trackId}/play`);
  }
};