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

    } catch (error) {
      console.error('Export failed:', error);
      addNotification({
        event: 'ExportFailed',
        message: 'Ошибка инициации сведения',
        status: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant="primary" 
      onClick={handleExport} 
      isLoading={isExporting}
      disabled={tracks.length === 0}
    >
      Экспорт (Render)
    </Button>
  );
};