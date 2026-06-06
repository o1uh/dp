'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trackApi, Track } from '@/entities/track/api';
import { TrackRow } from '@/entities/track/ui/TrackRow';
import { QUERY_KEYS } from '@/shared/api/query-keys';
import { useUserStore } from '@/entities/user/model/store';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

const AVAILABLE_GENRES = [
  'Ambient', 'Blues', 'Classical', 'Country', 'Electronic',
  'Folk', 'Funk', 'Hip-Hop', 'Jazz', 'Lo-Fi', 'Metal',
  'Pop', 'R&B', 'Reggae', 'Rock', 'Techno', 'House'
];

type SourceFilter = 'all' | 'mine' | 'catalog';
type ModelKey = 'htdemucs' | 'cascade';

const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'primary' | 'secondary';
}> = ({ active, onClick, children, tone = 'primary' }) => {
  const baseClass = "px-2.5 py-1.5 text-[10px] font-mono font-bold rounded-lg border transition-all duration-200 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap";
  const activeClass = tone === 'primary'
    ? 'bg-primary/15 border-primary/40 text-primary shadow-[0_0_18px_-6px_rgba(99,102,241,0.45)]'
    : 'bg-secondary/15 border-secondary/40 text-secondary shadow-[0_0_18px_-6px_rgba(236,72,153,0.45)]';
  const inactiveClass = 'bg-background-surface/30 border-border/60 text-gray-400 hover:border-border-strong hover:text-gray-200';

  return (
    <button
      onClick={onClick}
      className={`${baseClass} ${active ? activeClass : inactiveClass}`}
    >
      {active && (
        <span className={`w-1 h-1 rounded-full ${tone === 'primary' ? 'bg-primary' : 'bg-secondary'}`} />
      )}
      {children}
    </button>
  );
};

export const TrackGrid = () => {
  const queryClient = useQueryClient();
  const userId = useUserStore(state => state.profile?.id);

  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editForm, setEditForm] = useState({ title: '', genre: '', visibility: 'private' });
  const [genreSearch, setGenreSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [modelFilter, setModelFilter] = useState<Set<ModelKey>>(new Set());

  const toggleModel = (key: ModelKey) => {
    setModelFilter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.TRACKS.LIST(userId),
    queryFn: () => trackApi.getTracks(1, 50),
    enabled: !!userId
  });

  const deleteMutation = useMutation({
    mutationFn: trackApi.deleteTrack,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['catalog'] });
      const prevCatalog = queryClient.getQueriesData({ queryKey: ['catalog'] });

      queryClient.setQueriesData<any>({ queryKey: ['catalog'] }, (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((t: any) =>
            t.id === id && t.save_count > 0
              ? { ...t, save_count: t.save_count - 1, is_saved: false }
              : t
          )
        };
      });

      return { prevCatalog };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (_err, _vars, ctx) => {
      ctx?.prevCatalog?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<Track> }) => trackApi.updateTrack(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
      setEditingTrack(null);
      setGenreSearch('');
    }
  });

  const handleDownload = async (id: string) => {
    try {
      const url = await trackApi.getDownloadUrl(id);
      window.location.href = url;
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот трек?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEditClick = (track: Track) => {
    setEditingTrack(track);
    setEditForm({ title: track.title, genre: track.genre || '', visibility: track.visibility });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrack) {
      updateMutation.mutate({ id: editingTrack.id, payload: editForm as Partial<Track> });
    }
  };

  // Разбор жанров в массив
  const currentGenres = useMemo(() => {
    return editForm.genre
      ? editForm.genre.split(',').map(g => g.trim()).filter(Boolean)
      : [];
  }, [editForm.genre]);

  const addGenre = (genre: string) => {
    if (!currentGenres.includes(genre)) {
      const updated = [...currentGenres, genre].join(', ');
      setEditForm({ ...editForm, genre: updated });
    }
    setGenreSearch('');
  };

  const removeGenre = (genreToRemove: string) => {
    const updated = currentGenres.filter(g => g !== genreToRemove).join(', ');
    setEditForm({ ...editForm, genre: updated });
  };

  const searchResults = useMemo(() => {
    if (!genreSearch) return [];
    return AVAILABLE_GENRES.filter(
      genre => genre.toLowerCase().includes(genreSearch.toLowerCase()) && !currentGenres.includes(genre)
    );
  }, [genreSearch, currentGenres]);

  const effectiveModelFilter: 'all' | '4' | '5' = useMemo(() => {
    const has4 = modelFilter.has('htdemucs');
    const has5 = modelFilter.has('cascade');
    if ((has4 && has5) || (!has4 && !has5)) return 'all';
    if (has4) return '4';
    return '5';
  }, [modelFilter]);

  const isFilterActive = sourceFilter !== 'all' || modelFilter.size > 0;

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter(track => {
      const isOwnerTrack = !track.user_id || track.user_id === userId;

      if (sourceFilter === 'mine' && !isOwnerTrack) return false;
      if (sourceFilter === 'catalog' && isOwnerTrack) return false;

      const has4 = track.processed_models?.some(m => m.model_name === 'htdemucs') ?? false;
      const has5 = track.processed_models?.some(m => m.model_name === 'cascade_guitar') ?? false;

      if (effectiveModelFilter === '4' && (!has4 || has5)) return false;
      if (effectiveModelFilter === '5' && !has5) return false;

      return true;
    });
  }, [data, sourceFilter, effectiveModelFilter, userId]);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-secondary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">Библиотека</h2>
          </div>
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Загрузка...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gradient-to-br from-background-surface/40 to-background-surface/10 border border-border/60 rounded-2xl p-4 space-y-3 backdrop-blur-sm">
              <div className="flex justify-between">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-3 w-10" />
              </div>
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="grid grid-cols-2 gap-1.5 mt-4">
                <div className="skeleton h-9 w-full" />
                <div className="skeleton h-9 w-full" />
              </div>
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full p-10 flex flex-col items-center justify-center gap-3 mt-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-accent-red/20 blur-xl" />
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-red/20 to-red-500/10 border border-accent-red/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-accent-red">Ошибка загрузки библиотеки</p>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">Попробуйте обновить страницу</p>
        </div>
      </div>
    );
  }

  if (data?.items.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-secondary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-200">Библиотека</h2>
          </div>
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">0 треков</span>
        </div>
        <div className="relative overflow-hidden border border-dashed border-border/60 rounded-2xl bg-background-surface/20">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl animate-breathe" />
              <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
            </div>
            <h3 className="text-base font-bold text-gray-100 tracking-tight mb-2">Добавьте что-то новое</h3>
            <p className="text-xs text-gray-400 max-w-sm">
              Загрузите свой первый трек — нейросеть разделит его на вокал, барабаны, бас и гитару за пару минут
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              Перетащите файл в зону загрузки выше
            </div>
          </div>
        </div>
      </div>
    );
  }

  const trackWord = data.total === 1 ? 'трек' : data.total < 5 ? 'трека' : 'треков';
  const showFilteredCount = isFilterActive && filteredItems.length !== data.total;

  return (
    <div>
      <div className="flex flex-col gap-2.5 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 mr-1">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-secondary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-200">Библиотека</h2>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterChip active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')}>Все треки</FilterChip>
            <FilterChip active={sourceFilter === 'mine'} onClick={() => setSourceFilter('mine')}>Мои</FilterChip>
            <FilterChip active={sourceFilter === 'catalog'} onClick={() => setSourceFilter('catalog')}>Каталог</FilterChip>
          </div>

          <div className="hidden sm:block w-px h-4 bg-border/60 mx-1" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterChip active={modelFilter.has('htdemucs')} onClick={() => toggleModel('htdemucs')} tone="primary">4 STEMS</FilterChip>
            <FilterChip active={modelFilter.has('cascade')} onClick={() => toggleModel('cascade')} tone="secondary">5 STEMS</FilterChip>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {isFilterActive && (
              <button
                onClick={() => { setSourceFilter('all'); setModelFilter(new Set()); }}
                className="text-[10px] font-mono text-gray-500 hover:text-accent-red uppercase tracking-widest transition-colors"
              >
                Сбросить
              </button>
            )}
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest tabular-nums">
              {showFilteredCount ? (
                <>
                  <span className="text-primary font-bold">{filteredItems.length}</span> / {data.total} {trackWord}
                </>
              ) : (
                <>
                  <span className="text-primary font-bold">{data.total}</span> {trackWord}
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="relative overflow-hidden border border-dashed border-border/60 rounded-2xl bg-background-surface/20">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col items-center justify-center text-center py-14 px-6">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl animate-breathe" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-200 tracking-tight mb-1.5">Ничего не найдено</h3>
            <p className="text-xs text-gray-400 max-w-sm">
              Попробуйте изменить фильтры — например, сбросить выбор моделей или переключить источник.
            </p>
            <button
              onClick={() => { setSourceFilter('all'); setModelFilter(new Set()); }}
              className="mt-4 text-[10px] font-mono font-bold uppercase tracking-widest text-primary hover:text-primary-hover transition-colors"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((track, idx) => (
            <div
              key={track.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(idx * 40, 400)}ms`, animationFillMode: 'both' }}
            >
              <TrackRow
                track={track}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onEdit={handleEditClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingTrack && (
        <Modal onClose={() => setEditingTrack(null)} title="Редактировать трек" size="sm">
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <Input 
              label="Название" 
              value={editForm.title} 
              onChange={(e) => setEditForm({...editForm, title: e.target.value})} 
              required 
            />
            
            {/* Мультиселектор жанров */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">Жанры</label>
              
              {/* Список выбранных тегов */}
              <div className="flex flex-wrap gap-1.5 mb-1 min-h-[26px]">
                {currentGenres.length === 0 ? (
                  <span className="text-[10px] text-gray-600 self-center">Жанры не выбраны</span>
                ) : (
                  currentGenres.map(genre => (
                    <span 
                      key={genre}
                      onClick={() => removeGenre(genre)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary cursor-pointer hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/20 transition-all duration-150"
                      title="Нажмите для удаления"
                    >
                      {genre} ✕
                    </span>
                  ))
                )}
              </div>

              {/* Поиск жанра */}
              <div className="relative">
                <Input 
                  placeholder="Поиск жанра для добавления..." 
                  value={genreSearch}
                  onChange={(e) => setGenreSearch(e.target.value)}
                  leftIcon={
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  }
                />
                
                {/* Выпадающий список результатов с исправленной контрастностью hover-эффектов */}
                {genreSearch && (
                  <div className="absolute left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-background-surface border border-border rounded-xl shadow-elevated z-50 divide-y divide-border">
                    {searchResults.length === 0 ? (
                      <span className="block px-3 py-2 text-[10px] font-mono text-gray-500">Совпадений нет</span>
                    ) : (
                      searchResults.map(genre => (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => addGenre(genre)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-primary/10 hover:text-primary transition-all duration-150"
                        >
                          + {genre}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">Видимость</label>
              <div className="relative">
                <select 
                  className="w-full px-3.5 py-3 bg-background-deep text-gray-100 text-xs border border-border rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 appearance-none cursor-pointer"
                  value={editForm.visibility}
                  onChange={(e) => setEditForm({...editForm, visibility: e.target.value})}
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  {/* <option value="unlisted">Unlisted</option> */}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setEditingTrack(null)}>Отмена</Button>
              <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>Сохранить</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};