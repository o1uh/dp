'use client';

import React from 'react';
import { useNotificationStore } from '@/entities/notification/model/store';
import { Button } from '@/shared/ui/Button';

export const TrackGrid = () => {
  const readyTracks = useNotificationStore((state) => state.readyTasks);

  if (readyTracks.length === 0) {
    return (
      <div className="w-full h-48 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center bg-slate-800/30 mt-6">
        <p className="text-gray-500">Нет обработанных треков. Загрузите файл выше.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Готовые треки (Текущая сессия)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {readyTracks.map((track) => (
          <div key={track.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col justify-between">
            <div>
              <h3 className="text-primary font-bold truncate">
                Задача #{(track.task_id || track.id).substring(0, 8)}
              </h3>
              <p className="text-sm text-green-400 mt-1">Обработка завершена</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="w-full text-sm">Студия</Button>
              <Button variant="primary" className="w-full text-sm">Скачать</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};