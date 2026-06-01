import { apiClient } from '@/shared/api/rest';

export interface StudioTrackPayload {
  stem_id?: string;
  file_id?: string;
  track_index: number;
  volume: number;
  pan: number;
  is_muted: boolean;
  is_solo: boolean;
  start_offset_ms: number;
  trim_start_ms: number;
  trim_end_ms?: number;
}

export interface SessionPayload {
  project_name: string;
  global_settings: Record<string, any>;
  tracks: StudioTrackPayload[];
}

export const studioApi = {
  loadSession: async (sessionId: string, taskId?: string | null) => {
    const { data } = await apiClient.get(`/sessions/${sessionId}`, {
      params: taskId ? { task_id: taskId } : {}
    });
    return data;
  },
  
  saveSession: async (sessionId: string, payload: SessionPayload) => {
    const { data } = await apiClient.post(`/sessions/${sessionId}`, payload);
    return data;
  },

  exportSession: async (sessionId: string) => {
    const { data } = await apiClient.post(`/sessions/${sessionId}/export`);
    return data;
  }
};