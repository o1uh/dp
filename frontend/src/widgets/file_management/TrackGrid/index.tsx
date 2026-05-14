'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trackApi } from '@/entities/track/api';
import { TrackRow } from '@/entities/track/ui/TrackRow';
import { QUERY_KEYS } from '@/shared/api/query-keys';
import { useUserStore } from '@/entities/user/model/store';

export const TrackGrid = () => {
  const queryClient = useQueryClient();
  const userId = useUserStore(state => state.profile?.id);

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
          />
        ))}
      </div>
    </div>
  );
};