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
import { ProcessedModelInfo } from '@/entities/track/api';

const MODEL_LABELS: Record<string, string> = {
  htdemucs: 'HTDemucs',
  cascade_guitar: 'Cascade',
  render: 'Render'
};

const formatStemIndicator = (models: ProcessedModelInfo[] | undefined) => {
  if (!models || models.length === 0) {
    return {
      count: 0,
      label: 'Нет стемов',
      tone: 'muted' as const,
      tooltip: 'Трек ещё не обработан нейросетью'
    };
  }

  const total = Math.max(...models.map(m => m.stem_count));
  const hasCascade = models.some(m => m.model_name === 'cascade_guitar');
  const hasRender = models.some(m => m.model_name === 'render');
  const hasHtdemucs = models.some(m => m.model_name === 'htdemucs');

  const modelNames = models
    .map(m => MODEL_LABELS[m.model_name] ?? m.model_name)
    .join(' + ');

  if (hasCascade) {
    return {
      count: 5,
      label: '5 STEMS',
      tone: 'secondary' as const,
      tooltip: `5 стемов (${modelNames})`
    };
  }

  if (hasRender && !hasHtdemucs) {
    return {
      count: 1,
      label: '1 STEM',
      tone: 'muted' as const,
      tooltip: `1 стем (${modelNames})`
    };
  }

  if (hasHtdemucs && hasRender) {
    return {
      count: 4,
      label: '4 STEMS',
      tone: 'muted' as const,
      tooltip: `4 стема HTDemucs + 1 Render (${total} доступно)`
    };
  }

  return {
    count: total,
    label: `${total} STEMS`,
    tone: 'muted' as const,
    tooltip: `${total} стемов (${modelNames})`
  };
};

const StemsIndicator: React.FC<{ models?: ProcessedModelInfo[] }> = ({ models }) => {
  const indicator = formatStemIndicator(models);

  const toneClass =
    indicator.tone === 'secondary'
      ? 'bg-secondary/15 text-secondary border-secondary/30'
      : 'bg-background-deep text-gray-400 border-border';

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg border ${toneClass}`}
      title={indicator.tooltip}
    >
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      <span className="tracking-wider">{indicator.label}</span>
    </div>
  );
};

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
    <div className="flex flex-col xl:flex-row gap-6 items-start animate-fade-in">
      {/* Filters sidebar */}
      <div className="w-full xl:w-72 flex-shrink-0">
        <div className="glass rounded-2xl p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">ФИЛЬТРЫ</span>
          </div>
          <SearchFilters />
        </div>
      </div>
      
      {/* Results */}
      <div className="flex-1 w-full">
        <div className="glass rounded-2xl overflow-hidden shadow-soft">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h1 className="text-sm font-bold tracking-wider text-gray-200">Публичный каталог</h1>
            <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">
              {data?.items.length || 0} треков
            </span>
          </div>

          {isLoading ? (
            <div className="p-10 flex flex-col items-center gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Поиск треков...</span>
            </div>
          ) : !data?.items.length ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-background-deep border border-border flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-300">Ничего не найдено</p>
                <p className="text-xs text-gray-500 mt-1">Попробуйте изменить параметры поиска или жанровые фильтры.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.items.map((track, idx) => (
                <div 
                  key={track.id} 
                  className="px-5 py-4 hover:bg-background-deep/30 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <span className="text-xs font-mono text-gray-500 w-6 text-right tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <button 
                      onClick={() => handlePlay(track)}
                      className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-200 flex items-center justify-center flex-shrink-0 active:scale-90 shadow-glow-primary group-hover:shadow-lg"
                    >
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-semibold text-gray-200 truncate group-hover:text-primary transition cursor-pointer">
                        {track.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-500 uppercase flex-wrap">
                        <span>{track.genre || 'Default'}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{track.save_count} сохранений</span>
                        {track.original_filename && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span>
                              {track.original_filename.split('.').pop()?.toUpperCase()}
                            </span>
                          </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <StemsIndicator models={track.processed_models} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-14 sm:pl-0">
                    {currentUserId === track.user_id ? (
                      <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-gray-500 px-3 py-1.5 bg-background-elevated rounded-xl border border-border">
                        Мой трек
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