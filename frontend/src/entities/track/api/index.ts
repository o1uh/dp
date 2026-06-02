import { apiClient } from '@/shared/api/rest';
import { PaginatedResponse } from '@/shared/api/types';

export interface ProcessedModelInfo {
  task_id: string;
  model_name: string;
  stem_count: number;
  created_at: string;
}

export interface Track {
  id: string;
  user_id?: string;
  file_id?: string;
  title: string;
  original_filename?: string;
  genre?: string;
  bpm?: number;
  tags?: string[];
  visibility: 'private' | 'public' | 'unlisted';
  play_count: number;
  save_count: number;
  downloads_count: number;
  created_at: string;
  deleted_at?: string | null;
  processed_models?: ProcessedModelInfo[];
  is_processing?: boolean;
  is_failed?: boolean;
  error_message?: string | null;
}

export const trackApi = {
  getTracks: async (page = 1, limit = 20): Promise<PaginatedResponse<Track>> => {
    const { data } = await apiClient.get('/tracks', { params: { page, limit } });
    return data;
  },
  updateTrack: async (id: string, payload: Partial<Track>): Promise<void> => {
    await apiClient.put(`/tracks/${id}`, payload);
  },
  deleteTrack: async (id: string): Promise<void> => {
    await apiClient.delete(`/tracks/${id}`);
  },
  getDownloadUrl: async (id: string): Promise<string> => {
    const { data } = await apiClient.get(`/tracks/${id}/download`);
    return data.download_url;
  }
};