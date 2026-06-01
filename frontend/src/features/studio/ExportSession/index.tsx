'use client';

import React, { useState } from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { studioApi, SessionPayload } from '@/entities/studio_session/api';
import { Button } from '@/shared/ui/Button';
import { useNotificationStore } from '@/entities/notification/model/store';

export const ExportSession = () => {
  const { sessionId, projectName, tracks } = useStudioSessionStore();
  const [isExporting, setIsExporting] = useState(false);
  const addNotification = useNotificationStore(state => state.addNotification);

  const anySolo = tracks.some(t => t.is_solo);
  const hasActiveTracks = tracks.some(t => {
    if (t.is_muted) return false;
    if (anySolo && !t.is_solo) return false;
    return true;
  });

  const handleExport = async () => {
    if (!sessionId) return;
    setIsExporting(true);

    try {
      const payload: SessionPayload = {
        project_name: projectName,
        global_settings: {},
        tracks: tracks.map((t, idx) => ({
          stem_id: t.stem_id || undefined,
          file_id: t.file_id || undefined,
          track_index: idx,
          volume: t.volume,
          pan: t.pan,
          is_muted: t.is_muted,
          is_solo: t.is_solo,
          start_offset_ms: t.start_offset_ms,
          trim_start_ms: t.trim_start_ms,
          trim_end_ms: t.trim_end_ms || undefined
        }))
      };

      await studioApi.saveSession(sessionId, payload);
      
      const res = await studioApi.exportSession(sessionId);
      
      addNotification({
        event: 'ExportStarted',
        message: 'Сведение запущено. Задача выполняется на сервере.',
        status: 'processing',
        task_id: res.task_id
      });

    } catch (error: any) {
      console.error('Export failed:', error);
      const errMsg = error.response?.data?.message || 'Ошибка инициации сведения';
      addNotification({
        event: 'ExportFailed',
        message: errMsg,
        status: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleExport}
      isLoading={isExporting}
      disabled={tracks.length === 0 || !hasActiveTracks}
      rightIcon={
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 6m0 0l-4.5 4.5M12 6v13.5" />
        </svg>
      }
    >
      {isExporting ? 'Сведение...' : 'Экспорт'}
    </Button>
  );
};