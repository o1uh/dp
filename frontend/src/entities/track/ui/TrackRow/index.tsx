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
  
  const isPrivateByOther = !isOwner && track.visibility === 'private';
  const isDeleted = !!track.deleted_at;
  const isFailed = !!track.is_failed;
  const isProcessingActive = track.is_processing || isReprocessing;

  const isUnavailable = isDeleted || isFailed || isPrivateByOther;
  const isActionsDisabled = isDeleted || isFailed || isProcessingActive || isPrivateByOther;

  const hasHtdemucs = track.processed_models?.some(m => m.model_name === 'htdemucs') ?? false;
  const hasCascade = track.processed_models?.some(m => m.model_name === 'cascade_guitar') ?? false;

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
    if (!track.file_id || isActionsDisabled) return;
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

  const fileExtension = useMemo(() => {
    if (!track.original_filename) return '';
    const parts = track.original_filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  }, [track.original_filename]);

  const cardStyleClass = useMemo(() => {
    if (isDeleted || isPrivateByOther) return 'border-accent-red/20 bg-red-950/[0.03]';
    if (isFailed) return 'border-accent-red/30 bg-accent-red/[0.02]';
    return 'border-border hover:border-border-strong hover:bg-background-surface/50';
  }, [isDeleted, isFailed, isPrivateByOther]);

  const statusDetails = useMemo(() => {
    if (!isUnavailable) return null;
    
    if (isDeleted) {
      return {
        title: '🗑️ Трек недоступен',
        description: isOwner 
          ? 'Вы удалили этот трек из личной библиотеки.' 
          : 'Оригинальный трек был удален его владельцем.'
      };
    }
    
    if (isFailed) {
      return {
        title: '⚠️ Сбой сегментации',
        description: track.error_message || 'Внутренняя ошибка воркера при обработке нейросетью.'
      };
    }
    
    if (isPrivateByOther) {
      return {
        title: '🔒 Приватный трек',
        description: 'Владелец перевел этот трек в приватный режим. Сведение и скачивание ограничены.'
      };
    }
    
    return null;
  }, [isUnavailable, isDeleted, isFailed, isPrivateByOther, isOwner, track.error_message]);

  return (
    <div className={`
      group relative bg-background-surface border rounded-xl p-4 
      flex flex-col justify-between 
      transition-all duration-200 hover:scale-[1.01] hover:shadow-elevated
      ${cardStyleClass}
    `}>
      {/* Top section */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
              {new Date(track.created_at).toLocaleDateString('ru-RU')}
            </span>
            {fileExtension && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-background-deep border border-border text-gray-400">
                {fileExtension}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!isOwner && (
              <span className="text-[9px] font-mono font-black text-secondary uppercase tracking-wider">
                Каталог
              </span>
            )}
            <span className={`w-1.5 h-1.5 rounded-full ${track.visibility === 'public' && !isUnavailable ? 'bg-accent-green' : 'bg-gray-500'}`} />
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">{track.visibility}</span>
          </div>
        </div>

        <h3 className={`text-sm font-bold truncate transition duration-200 ${isUnavailable ? 'text-gray-500 line-through' : 'text-gray-100 group-hover:text-primary'}`}>
          {track.title}
        </h3>

        {/* Бейджи статусов с исключением наложений по приоритету */}
        <div className="mt-2.5 flex gap-1.5 flex-wrap min-h-[24px] items-center">
          {isProcessingActive ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/25 animate-pulse">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-yellow opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-yellow" />
              </span>
              ОБРАБОТКА AI...
            </span>
          ) : isDeleted ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-background-deep text-gray-300 border border-border">
              🗑️ ТРЕК УДАЛЕН
            </span>
          ) : isFailed ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-accent-red/15 text-accent-red border border-accent-red/25">
              ⚠️ СБОЙ ОБРАБОТКИ AI
            </span>
          ) : isPrivateByOther ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-accent-red/15 text-accent-red border border-accent-red/25">
              🔒 ПРИВАТНЫЙ ТРЕК
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
              {isOwner && hasHtdemucs && !hasCascade && (
                <button
                  onClick={handleReprocess}
                  disabled={isProcessingActive}
                  className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 transition flex items-center gap-1 active:scale-95"
                >
                  ⭐ До 5 стемов
                </button>
              )}
            </>
          )}
        </div>

        {!isUnavailable && (
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

      {/* Actions Section */}
      <div className="mt-4 min-h-[96px] flex flex-col justify-between gap-2.5">
        {isUnavailable && statusDetails ? (
          <div className="flex-1 flex flex-col justify-center p-3 rounded-xl bg-accent-red/[0.03] border border-accent-red/10 text-center min-h-[82px] animate-fade-in-scale">
            <p className="text-[10px] font-mono font-bold text-accent-red uppercase tracking-wider mb-1">
              {statusDetails.title}
            </p>
            <p className="text-[10px] text-gray-300 leading-normal">
              {statusDetails.description}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <button 
              onClick={() => !isActionsDisabled && setPlaylist([track], 0)}
              disabled={isActionsDisabled}
              className="px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-glow-primary active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Слушать
            </button>
            
            <div className="relative w-full">
              {track.processed_models && track.processed_models.length > 1 ? (
                <>
                  <button 
                    onClick={() => !isProcessingActive && setShowVersionMenu(!showVersionMenu)}
                    disabled={isProcessingActive}
                    className="w-full px-3 py-2 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    В студию
                    <svg className={`w-2.5 h-2.5 transition-transform ${showVersionMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  
                  {showVersionMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowVersionMenu(false)} />
                      <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-background-surface border border-border-strong rounded-xl shadow-elevated overflow-hidden z-50 flex flex-col divide-y divide-border">
                        {track.processed_models.map((model) => (
                          <Link 
                            key={model.task_id} 
                            href={`/studio/${track.id}?task_id=${model.task_id}`}
                            onClick={() => setShowVersionMenu(false)}
                            className="px-3 py-2.5 text-[10px] font-mono text-left text-gray-200 hover:bg-background-deep block transition"
                          >
                            <span>{model.model_name === 'cascade_guitar' ? '⭐ 5 Stems' : '4 Stems'}</span>
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
                    className="w-full px-3 py-2 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-xl transition active:scale-95"
                  >
                    В студию
                  </button>
                </Link>
              )}
            </div>

            <button 
              onClick={() => !isUnavailable && onDownload(track.id)}
              disabled={isActionsDisabled}
              className="px-3 py-2 bg-background-elevated hover:bg-background-deep border border-border text-gray-200 hover:text-gray-100 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              Скачать
            </button>
            
            {onEdit && isOwner ? (
              <button 
                onClick={() => onEdit(track)}
                disabled={isProcessingActive}
                className="px-3 py-2 bg-background-elevated hover:bg-background-deep border border-border text-gray-200 hover:text-gray-100 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                Инфо
              </button>
            ) : (
              <span className="px-3 py-2 bg-background-deep text-gray-500 text-[10px] font-mono font-bold flex items-center justify-center rounded-xl border border-border">
                {!isOwner ? 'КАТАЛОГ' : 'НЕДОСТУПЕН'}
              </span>
            )}
          </div>
        )}

        {/* Кнопка удаления (всегда активна для очистки личной библиотеки) */}
        <button 
          onClick={() => onDelete(track.id)}
          disabled={isProcessingActive}
          className="w-full mt-1.5 text-center text-[10px] font-mono font-bold text-gray-400 hover:text-accent-red hover:bg-accent-red/10 py-1.5 rounded-xl transition"
        >
          Удалить из библиотеки
        </button>
      </div>
    </div>
  );
};