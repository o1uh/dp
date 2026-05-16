'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/entities/catalog/api';
import { SearchFilters } from '@/features/catalog/SearchFilters';
import { SaveToLibraryBtn } from '@/features/catalog/SaveToLibraryBtn';
import { Button } from '@/shared/ui/Button';
import { QUERY_KEYS } from '@/shared/api/query-keys';
import { useUserStore } from '@/entities/user/model/store';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';

export const CatalogView = () => {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || undefined;
  const genre = searchParams.get('genre') || undefined;
  const currentUserId = useUserStore(state => state.profile?.id);
  const setPlaylist = useAudioQueueStore(state => state.setPlaylist);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.CATALOG.SEARCH({ q, genre }),
    queryFn: () => catalogApi.search({ q, genre, page: 1, limit: 50 })
  });

  const handlePlay = (track: any) => {
    catalogApi.registerPlay(track.id);
    setPlaylist([track], 0);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 flex-shrink-0">
        <SearchFilters />
      </div>
      
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-primary mb-6">Глобальный каталог</h1>
        
        {isLoading ? (
          <div className="text-gray-400">Поиск...</div>
        ) : !data?.items.length ? (
          <div className="text-gray-500 bg-slate-800/30 p-8 rounded border border-dashed border-slate-700 text-center">
            Ничего не найдено
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {data.items.map((track) => (
              <div key={track.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-bold truncate">{track.title}</h3>
                  <div className="mt-2 text-xs text-gray-400 flex gap-4">
                    <span>Плеев: {track.play_count}</span>
                    <span>Сохранений: {track.save_count}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="primary" className="w-full text-xs py-1" onClick={() => handlePlay(track)}>
                    ▶ Play
                  </Button>
                  
                  {currentUserId === track.user_id ? (
                    <Button variant="secondary" className="w-full text-xs py-1 opacity-50 cursor-not-allowed" disabled>
                      Мой трек
                    </Button>
                  ) : (
                    <div className="w-full">
                      <SaveToLibraryBtn trackId={track.id} isSaved={track.is_saved} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};