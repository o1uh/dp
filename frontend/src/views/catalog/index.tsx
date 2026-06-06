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

const ModelChip: React.FC<{ label: string; premium?: boolean; tooltip?: string }> = ({ label, premium, tooltip }) => {
  const toneClass = premium
    ? 'bg-secondary/15 text-secondary border-secondary/30 shadow-glow'
    : 'bg-background-deep/70 text-gray-300 border-border/60';

  return (
    <div
      className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${toneClass}`}
      title={tooltip}
    >
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      <span className="tracking-wider">{label}</span>
    </div>
  );
};

const StemsChips: React.FC<{ models?: ProcessedModelInfo[] }> = ({ models }) => {
  if (!models || models.length === 0) {
    return <ModelChip label="Нет стемов" tooltip="Трек ещё не обработан нейросетью" />;
  }

  const hasHtdemucs = models.some(m => m.model_name === 'htdemucs');
  const hasCascade = models.some(m => m.model_name === 'cascade_guitar');
  const hasRender = models.some(m => m.model_name === 'render');

  const chips: React.ReactNode[] = [];

  if (hasHtdemucs) {
    chips.push(<ModelChip key="4" label="4 STEMS" tooltip="HTDemucs: вокал, барабаны, бас, другое" />);
  }
  if (hasCascade) {
    chips.push(<ModelChip key="5" label="5 STEMS" premium tooltip="Cascade: вокал, барабаны, бас, гитара, другое" />);
  }
  if (hasRender && !hasHtdemucs && !hasCascade) {
    chips.push(<ModelChip key="render" label="1 STEM" tooltip="Render: мастер-стем" />);
  }

  if (chips.length === 0) {
    return <ModelChip label="Нет стемов" />;
  }

  return <>{chips}</>;
};

const FileExtChip: React.FC<{ filename?: string }> = ({ filename }) => {
  if (!filename) return null;
  const ext = filename.split('.').pop()?.toUpperCase();
  if (!ext) return null;
  return (
    <span className="inline-flex items-center text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-background-deep/70 border border-border/60 text-gray-400 tracking-wider">
      {ext}
    </span>
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
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative glass rounded-2xl p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-5">
              <span className="grid place-items-center w-6 h-6 rounded-lg bg-primary/10 border border-primary/20">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </span>
              <span className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-[0.2em]">Фильтры</span>
              <span className="ml-auto text-[9px] font-mono text-gray-500 tracking-widest tabular-nums">{data?.items.length || 0}</span>
            </div>
            <SearchFilters />
          </div>
        </div>

        {/* Quick stats card under filters */}
        <div className="mt-4 relative overflow-hidden glass rounded-2xl p-4">
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Активные фильтры</p>
            <div className="flex flex-wrap gap-1.5">
              {q && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary">
                  <span className="opacity-60">q:</span>
                  <span className="truncate max-w-[120px]">{q}</span>
                </span>
              )}
              {genre && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-[10px] font-mono text-secondary">
                  <span className="opacity-60">ж:</span>
                  {genre}
                </span>
              )}
              {!q && !genre && (
                <span className="text-[10px] font-mono text-gray-500 italic">Не применены</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 w-full min-w-0">
        <div className="relative glass rounded-2xl overflow-hidden shadow-soft">
          {/* Ambient gradients */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -top-12 right-0 w-64 h-64 bg-secondary/8 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative px-6 py-5 border-b border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-white/[0.06]">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.467.732-3.559" />
                </svg>
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight text-gray-100 leading-tight">Публичный каталог</h1>
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.18em] mt-0.5 truncate">
                  Декомпозиция треков сообществом
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] font-mono text-gray-500 uppercase tracking-widest px-2.5 py-1.5 rounded-lg border border-border bg-background-deep/50">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green" />
                </span>
                Live
              </span>
              <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 tabular-nums">
                {data?.items.length || 0} треков
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-14 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
              </div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Поиск треков в каталоге...</span>
            </div>
          ) : !data?.items.length ? (
            <div className="p-14 text-center flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-background-elevated to-background-deep border border-border flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <div className="absolute -inset-2 rounded-3xl bg-primary/5 blur-xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-200">Ничего не найдено</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Попробуйте изменить параметры поиска или жанровые фильтры.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {data.items.map((track, idx) => (
                <div
                  key={track.id}
                  className="group relative px-6 py-4 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gradient-to-r hover:from-primary/[0.04] hover:via-transparent hover:to-transparent"
                >
                  {/* Hover accent line */}
                  <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-gradient-to-b from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
                    <div className="relative w-9 flex-shrink-0">
                      <span className="text-[10px] font-mono text-gray-500 w-9 text-right tabular-nums block group-hover:text-primary/70 transition-colors">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <button
                      onClick={() => handlePlay(track)}
                      className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/20 text-primary hover:from-primary hover:to-secondary hover:text-white hover:border-primary transition-all duration-300 flex items-center justify-center flex-shrink-0 active:scale-90 shadow-glow-primary group-hover:shadow-lg group-hover:scale-105"
                    >
                      <svg className="w-4 h-4 ml-0.5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="absolute inset-0 rounded-xl bg-primary/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                      <span className="text-sm font-semibold text-gray-100 truncate group-hover:text-gradient transition cursor-pointer">
                        {track.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono uppercase flex-wrap">
                        <FileExtChip filename={track.original_filename} />
                        <StemsChips models={track.processed_models} />
                        {track.genre && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-600" />
                            <span className="text-gray-500">{track.genre}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-[160px] flex-shrink-0 flex items-center justify-end gap-2">
                    <span className="w-7 text-right text-[10px] font-mono text-gray-400 tabular-nums">
                      {track.save_count > 0 ? track.save_count : '·'}
                    </span>
                    {currentUserId === track.user_id ? (
                      <span className="inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide rounded-xl transition-all duration-200 text-[10px] px-3.5 py-2 border border-border bg-background-elevated text-gray-400 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Мой трек</span>
                      </span>
                    ) : (
                      <SaveToLibraryBtn trackId={track.id} isSaved={track.is_saved} className="flex-1" />
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
