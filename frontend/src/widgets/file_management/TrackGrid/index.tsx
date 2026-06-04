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

export const TrackGrid = () => {
  const queryClient = useQueryClient();
  const userId = useUserStore(state => state.profile?.id);
  
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editForm, setEditForm] = useState({ title: '', genre: '', visibility: 'private' });
  const [genreSearch, setGenreSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.TRACKS.LIST(userId),
    queryFn: () => trackApi.getTracks(1, 50),
    enabled: !!userId
  });

  const deleteMutation = useMutation({
    mutationFn: trackApi.deleteTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
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

  if (isLoading) {
    return (
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-400">Мои треки</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background-surface/20 border border-border rounded-xl p-4 space-y-3">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-4 w-24" />
              <div className="grid grid-cols-2 gap-1.5 mt-4">
                <div className="skeleton h-8 w-full" />
                <div className="skeleton h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center gap-3 mt-6">
        <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center border border-accent-red/20">
          <svg className="w-5 h-5 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm text-accent-red font-semibold">Ошибка загрузки библиотеки</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Мои треки</h2>
        <span className="text-[10px] font-mono text-gray-600">{data.total} треков</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.items.map((track) => (
          <TrackRow 
            key={track.id} 
            track={track} 
            onDownload={handleDownload}
            onDelete={handleDelete}
            onEdit={handleEditClick}
          />
        ))}
      </div>

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