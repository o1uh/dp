'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/entities/catalog/api';
import { SearchFilters } from '@/features/catalog/SearchFilters';
import { SaveToLibraryBtn } from '@/features/catalog/SaveToLibraryBtn';
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
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      <div className="w-full xl:w-72 flex-shrink-0">
        <div className="bg-background-surface/40 border border-white/[0.06] rounded-xl p-5 backdrop-blur-md">
          <span className="text-[10px] font-mono font-black text-gray-600 block mb-4 uppercase tracking-widest">ФИЛЬТРАЦИЯ КАТАЛОГА</span>
          <SearchFilters />
        </div>
      </div>
      
      <div className="flex-1 w-full">
        <div className="bg-background-surface/20 border border-white/[0.04] rounded-xl overflow-hidden backdrop-blur-md">
          <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
            <h1 className="text-base font-bold tracking-wider uppercase text-gray-200">Публичный каталог</h1>
            <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">
              {data?.items.length || 0} ТРЕКОВ НАЙДЕНО
            </span>
          </div>

          {isLoading ? (
            <div className="p-10 flex flex-col items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">СИНХРОНИЗАЦИЯ БАЗЫ...</span>
            </div>
          ) : !data?.items.length ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/[0.04] flex items-center justify-center text-gray-600">✕</div>
              <div>
                <p className="text-xs font-bold text-gray-300">Ничего не найдено</p>
                <p className="text-[10px] text-gray-600 mt-1">Попробуйте изменить параметры поиска или жанровые фильтры.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {data.items.map((track, idx) => (
                <div 
                  key={track.id} 
                  className="p-4 hover:bg-white/[0.01] transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <span className="text-xs font-mono text-gray-600 w-6 text-right">{(idx + 1).toString().padStart(2, '0')}</span>
                    <button 
                      onClick={() => handlePlay(track)}
                      className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition flex items-center justify-center flex-shrink-0 active:scale-95 shadow-glow-primary"
                    >
                      <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-gray-200 truncate hover:text-primary transition cursor-pointer">{track.title}</span>
                      <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-gray-500 uppercase">
                        <span>Жанр: {track.genre || 'Default'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <span>Прослушиваний: {track.play_count}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-10 sm:pl-0">
                    {currentUserId === track.user_id ? (
                      <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-gray-600 px-3 py-1.5 bg-slate-900 rounded-lg">
                        МОЙ ТРЕК
                      </span>
                    ) : (
                      <SaveToLibraryBtn trackId={track.id} isSaved={track.is_saved} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};