'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/api/query-keys';
import { trackApi } from '@/entities/track/api';
import { userApi } from '@/entities/user/api';
import { useUserStore } from '@/entities/user/model/store';
import { formatBytes } from '@/shared/lib/formatting';
import { UploadZone } from '@/widgets/file_management/UploadZone';
import { TrackGrid } from '@/widgets/file_management/TrackGrid';

export const LibraryView = () => {
  const userId = useUserStore(state => state.profile?.id);

  const { data: profileData } = useQuery({
    queryKey: QUERY_KEYS.PROFILE.ME,
    queryFn: userApi.getProfile,
    enabled: !!userId
  });

  const { data: tracksData } = useQuery({
    queryKey: QUERY_KEYS.TRACKS.LIST(userId),
    queryFn: () => trackApi.getTracks(1, 50),
    enabled: !!userId
  });

  const totalTracks = tracksData?.total || 0;
  const storageUsedBytes = profileData?.storage_used_bytes || 0;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full select-none animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-white/[0.04]">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-gray-100">
            Моя аудио-библиотека
          </h1>
          <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-widest">
            ИМПОРТ ФАЙЛОВ И ДЕКОМПОЗИЦИЯ НА СТЕМЫ
          </p>
        </div>
        
        <div className="flex items-center gap-6 self-end md:self-auto">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Всего треков</span>
            <span className="text-lg font-bold text-primary font-mono mt-1 leading-none">{totalTracks}</span>
          </div>

          <div className="h-10 w-[1px] bg-white/[0.04]" />

          <div className="flex flex-col w-44">
            <div className="flex justify-between text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">
              <span>Хранилище</span>
              <span>Безлимитно</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/[0.02] group hover:border-white/[0.06] transition">
              <div 
                className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (storageUsedBytes / (1024 * 1024 * 1024)) * 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-gray-700 block mt-1.5">
              {formatBytes(storageUsedBytes)} из ∞ использовано
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-b from-white/[0.02] to-transparent border border-white/[0.04] p-1">
        <UploadZone />
      </div>

      <div>
        <TrackGrid />
      </div>
    </div>
  );
};