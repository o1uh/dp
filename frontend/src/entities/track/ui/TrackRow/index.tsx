'use client';

import React, { useState, useMemo } from 'react';
import { Track } from '../../api';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { useUserStore } from '@/entities/user/model/store';
import { useNotificationStore } from '@/entities/notification/model/store';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/rest';
import Link from 'next/link';

interface TrackRowProps {
  track: Track;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (track: Track) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({ track, onDownload, onDelete, onEdit }) => {
  const setPlaylist = useAudioQueueStore(state => state.setPlaylist);
  const currentUserId = useUserStore(state => state.profile?.id);
  const addNotification = useNotificationStore(state => state.addNotification);
  const queryClient = useQueryClient();
  
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const isOwner = !track.user_id || track.user_id === currentUserId;
  const isOrphaned = !!track.deleted_at && !isOwner;

  const hasHtdemucs = track.processed_models?.some(m => m.model_name === 'htdemucs') ?? false;
  const hasCascade = track.processed_models?.some(m => m.model_name === 'cascade_guitar') ?? false;
  const isProcessingActive = track.is_processing || isReprocessing;

  // Парсинг, очистка и сортировка жанров по алфавиту
  const sortedGenres = useMemo(() => {
    if (!track.genre) return [];
    return track.genre
      .split(',')
      .map(g => g.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [track.genre]);

  const handleReprocess = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track.file_id || isProcessingActive) return;
    setIsReprocessing(true);

    try {
      const res = await apiClient.post('/tasks', {
        file_id: track.file_id,
        config: { model: 'cascade_guitar' }
      });
      addNotification({
        event: 'TrackReady',
        message: 'Запущена дообработка трека на 5 стемов',
        status: 'processing',
        task_id: res.data.task_id
      });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    } catch (err: any) {
      addNotification({
        event: 'TrackReady',
        message: 'Не удалось запустить дообработку',
        status: 'error'
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  return (
    <div className={`
      group relative bg-background-surface border rounded-xl p-4 
      flex flex-col justify-between 
      transition-all duration-200 hover:scale-[1.01] hover:shadow-elevated
      ${isOrphaned 
        ? 'opacity-50 border-accent-red/20 bg-red-950/5' 
        : 'border-border hover:border-border-strong hover:bg-background-surface/50'
      }
    `}>
      {/* Top section */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
            {new Date(track.created_at).toLocaleDateString('ru-RU')}
          </span>
          <div className="flex items-center gap-1.5">
            {!isOwner && (
              <span className="text-[9px] font-mono font-black text-secondary uppercase tracking-wider">
                Каталог
              </span>
            )}
            <span className={`w-1.5 h-1.5 rounded-full ${track.visibility === 'public' ? 'bg-accent-green' : 'bg-gray-500'}`} />
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">{track.visibility}</span>
          </div>
        </div>

        <h3 className={`text-sm font-bold truncate transition duration-200 ${isOrphaned ? 'text-gray-500 line-through' : 'text-gray-100 group-hover:text-primary'}`}>
          {track.title}
        </h3>

        {/* Version badges */}
        <div className="mt-2.5 flex gap-1.5 flex-wrap min-h-[24px] items-center">
          {isProcessingActive ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/25 animate-pulse">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-yellow opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-yellow" />
              </span>
              ОБРАБОТКА AI...
            </span>
          ) : (
            <>
              {hasHtdemucs && (
                <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-background-deep text-gray-300 border border-border">
                  4 STEMS
                </span>
              )}
              {hasCascade && (
                <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-secondary/15 text-secondary border border-secondary/25 shadow-glow">
                  5 STEMS (CASCADE) ⭐
                </span>
              )}
              {isOwner && !isOrphaned && hasHtdemucs && !hasCascade && (
                <button
                  onClick={handleReprocess}
                  disabled={isProcessingActive}
                  className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 transition flex items-center gap-1 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                >
                  {isReprocessing ? (
                    <div className="w-2.5 h-2.5 rounded-full border border-secondary/20 border-t-secondary animate-spin" />
                  ) : (
                    '⭐ До 5 стемов'
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {isOrphaned ? (
          <div className="mt-3 text-[10px] font-mono font-bold text-accent-red uppercase tracking-wider">
            Файл больше не доступен
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {sortedGenres.length > 0 ? (
              sortedGenres.map((genre) => (
                <span 
                  key={genre}
                  className="text-[10px] font-semibold px-2 py-0.5 bg-background-deep border border-border text-gray-300 rounded-full"
                >
                  {genre}
                </span>
              ))
            ) : (
              <span className="text-[10px] italic text-gray-500">Без жанра</span>
            )}
            {track.bpm && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full">
                {track.bpm} BPM
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 relative">
        <button 
          onClick={() => !isOrphaned && setPlaylist([track], 0)}
          disabled={isOrphaned || isProcessingActive}
          className="px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-glow-primary active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Слушать
        </button>
        
        {/* Studio button with version menu */}
        {isOrphaned ? (
          <button 
            disabled 
            className="px-3 py-2 bg-background-deep border border-border text-gray-500 text-xs font-bold rounded-xl opacity-40 cursor-not-allowed"
          >
            В студию
          </button>
        ) : (
          <div className="relative w-full">
            {track.processed_models && track.processed_models.length > 1 ? (
              <>
                <button 
                  onClick={() => !isProcessingActive && setShowVersionMenu(!showVersionMenu)}
                  disabled={isProcessingActive}
                  className="w-full px-3 py-2 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
                >
                  В студию
                  <svg className={`w-2.5 h-2.5 transition-transform ${showVersionMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                
                {showVersionMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowVersionMenu(false)} />
                    <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-background-surface border border-border-strong rounded-xl shadow-elevated overflow-hidden z-50 flex flex-col divide-y divide-border animate-fade-in-up">
                      {track.processed_models.map((model) => (
                        <Link 
                          key={model.task_id} 
                          href={`/studio/${track.id}?task_id=${model.task_id}`}
                          onClick={() => setShowVersionMenu(false)}
                          className="px-3 py-2.5 text-[10px] font-mono text-left text-gray-200 hover:bg-background-deep block transition flex items-center justify-between"
                        >
                          <span>{model.model_name === 'cascade_guitar' ? '⭐ 5 Stems (Каскад)' : '4 Stems (HTDemucs)'}</span>
                          <svg className="w-2.5 h-2.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5-7.5" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link 
                href={isProcessingActive ? '#' : `/studio/${track.id}${track.processed_models?.[0] ? `?task_id=${track.processed_models[0].task_id}` : ''}`} 
                className={`w-full ${isProcessingActive ? 'pointer-events-none' : ''}`}
              >
                <button 
                  disabled={isProcessingActive}
                  className="w-full px-3 py-2 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-30"
                >
                  В студию
                </button>
              </Link>
            )}
          </div>
        )}

        <button 
          onClick={() => !isOrphaned && onDownload(track.id)}
          disabled={isOrphaned || isProcessingActive}
          className="px-3 py-2 bg-background-elevated hover:bg-background-deep border border-border text-gray-200 hover:text-gray-100 text-xs font-semibold rounded-xl transition disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-1.5"
        >
          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 6m0 0l-4.5 4.5M12 6v13.5" />
          </svg>
          Скачать
        </button>
        
        {onEdit && isOwner && !isOrphaned ? (
          <button 
            onClick={() => onEdit(track)}
            disabled={isProcessingActive}
            className="px-3 py-2 bg-background-elevated hover:bg-background-deep border border-border text-gray-200 hover:text-gray-100 text-xs font-semibold rounded-xl transition disabled:opacity-30 flex items-center justify-center gap-1.5"
          >
            <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Инфо
          </button>
        ) : (
          <span className="px-3 py-2 bg-background-deep text-gray-500 text-[10px] font-mono font-bold flex items-center justify-center rounded-xl border border-border">
            {!isOwner ? 'КАТАЛОГ' : 'НЕДОСТУПЕН'}
          </span>
        )}
        
        <button 
          onClick={() => onDelete(track.id)}
          disabled={isProcessingActive}
          className="col-span-2 mt-1 px-3 py-1.5 text-center text-[10px] font-mono font-semibold text-gray-500 hover:text-accent-red hover:bg-accent-red/5 rounded-xl transition disabled:opacity-30 disabled:pointer-events-none"
        >
          Удалить из библиотеки
        </button>
      </div>
    </div>
  );
};