'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trackApi, Track } from '@/entities/track/api';
import { TrackRow } from '@/entities/track/ui/TrackRow';
import { QUERY_KEYS } from '@/shared/api/query-keys';
import { useUserStore } from '@/entities/user/model/store';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

export const TrackGrid = () => {
  const queryClient = useQueryClient();
  const userId = useUserStore(state => state.profile?.id);
  
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editForm, setEditForm] = useState({ title: '', genre: '', visibility: 'private' });

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.TRACKS.LIST(userId),
    queryFn: () => trackApi.getTracks(1, 50),
    enabled: !!userId
  });

  const deleteMutation = useMutation({
    mutationFn: trackApi.deleteTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<Track> }) => trackApi.updateTrack(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
      setEditingTrack(null);
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

  if (isLoading) return <div className="mt-6 text-gray-400">Загрузка библиотеки...</div>;
  if (isError) return <div className="mt-6 text-red-500">Ошибка загрузки библиотеки</div>;
  if (!data?.items || data.items.length === 0) {
    return (
      <div className="w-full h-48 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center bg-slate-800/30 mt-6">
        <p className="text-gray-500">Библиотека пуста. Загрузите файлы выше.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Мои треки</h2>
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

      {editingTrack && (
        <Modal onClose={() => setEditingTrack(null)}>
          <form onSubmit={handleEditSubmit} className="bg-slate-900 p-6 rounded border border-slate-700 flex flex-col gap-4 w-96">
            <h3 className="text-lg font-bold text-white">Редактировать трек</h3>
            <Input 
              label="Название" 
              value={editForm.title} 
              onChange={(e) => setEditForm({...editForm, title: e.target.value})} 
              required 
            />
            <Input 
              label="Жанр" 
              value={editForm.genre} 
              onChange={(e) => setEditForm({...editForm, genre: e.target.value})} 
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300">Видимость</label>
              <select 
                className="px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded focus:border-primary focus:outline-none"
                value={editForm.visibility}
                onChange={(e) => setEditForm({...editForm, visibility: e.target.value})}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
              </select>
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