import { apiClient } from '@/shared/api/rest';
import { PaginatedResponse } from '@/shared/api/types';
import { Track } from '@/entities/track/api';

export interface CatalogTrack extends Track {
  user_id: string;
  is_saved: boolean;
}

export const catalogApi = {
  search: async (params: { q?: string; genre?: string; page?: number; limit?: number }): Promise<PaginatedResponse<CatalogTrack>> => {
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