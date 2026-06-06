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

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(track.created_at);
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  }, [track.created_at]);

  const cardStyleClass = useMemo(() => {
    if (isDeleted || isPrivateByOther) return 'border-accent-red/20 bg-gradient-to-br from-red-950/[0.04] to-background-surface/30';
    if (isFailed) return 'border-accent-red/30 bg-gradient-to-br from-accent-red/[0.03] to-background-surface/30';
    return 'border-border/70 bg-gradient-to-br from-background-surface/40 to-background-surface/10 hover:border-border-strong';
  }, [isDeleted, isFailed, isPrivateByOther]);

  const statusDetails = useMemo(() => {
    if (!isUnavailable) return null;

    if (isDeleted) {
      return {
        title: 'Трек удалён',
        description: isOwner
          ? 'Вы удалили этот трек из личной библиотеки.'
          : 'Оригинальный трек был удален его владельцем.'
      };
    }

    if (isFailed) {
      return {
        title: 'Сбой сегментации',
        description: track.error_message || 'Внутренняя ошибка воркера при обработке нейросетью.'
      };
    }

    if (isPrivateByOther) {
      return {
        title: 'Приватный трек',
        description: 'Владелец перевел этот трек в приватный режим. Сведение и скачивание ограничены.'
      };
    }

    return null;
  }, [isUnavailable, isDeleted, isFailed, isPrivateByOther, isOwner, track.error_message]);

  return (
    <div className={`
      group relative border rounded-2xl p-4
      flex flex-col h-full
      transition-all duration-300 hover:-translate-y-0.5
      backdrop-blur-sm overflow-hidden
      ${cardStyleClass}
      hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]
    `}>
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

      {/* Top section */}
      <div className="relative flex-shrink-0 min-h-[120px]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {formattedDate}
            </span>
            {fileExtension && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-background-deep/80 border border-border/60 text-gray-400 tracking-wider">
                {fileExtension}
              </span>
            )}
            {!isOwner && (
              <span className="text-[9px] font-mono font-bold text-secondary uppercase tracking-wider">
                · Каталог
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`relative flex h-2 w-2 ${track.visibility === 'public' && !isUnavailable ? '' : 'opacity-50'}`}>
              {track.visibility === 'public' && !isUnavailable && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-50" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${track.visibility === 'public' && !isUnavailable ? 'bg-accent-green' : 'bg-gray-500'}`} />
            </span>
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">{track.visibility}</span>
          </div>
        </div>

        <h3 className={`text-sm font-bold truncate transition-all duration-300 leading-tight ${isUnavailable ? 'text-gray-500 line-through' : 'text-gray-100 group-hover:text-gradient'}`}>
          {track.title}
        </h3>

        {/* Stems row — split 50/50: 4 model default | 5 model status (upgrade or done) */}
        {isProcessingActive ? (
          <div className="mt-2.5 min-h-[28px]">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-gradient-to-r from-accent-yellow/15 to-amber-500/10 text-accent-yellow border border-accent-yellow/25 animate-pulse">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-yellow opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-yellow" />
              </span>
              ОБРАБОТКА AI
            </span>
          </div>
        ) : isDeleted ? (
          <div className="mt-2.5 min-h-[28px]">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-background-deep/60 text-gray-400 border border-border/60">
              ТРЕК УДАЛЁН
            </span>
          </div>
        ) : isFailed ? (
          <div className="mt-2.5 min-h-[28px]">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-accent-red/15 text-accent-red border border-accent-red/25">
              СБОЙ ОБРАБОТКИ
            </span>
          </div>
        ) : isPrivateByOther ? (
          <div className="mt-2.5 min-h-[28px]">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-accent-red/15 text-accent-red border border-accent-red/25">
              ПРИВАТНЫЙ ТРЕК
            </span>
          </div>
        ) : hasHtdemucs || hasCascade ? (
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 min-h-[28px]">
            {/* Left: 4 STEMS — default */}
            <div className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-background-deep/60 border border-border/60">
              <svg className="w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="text-[9px] font-mono font-bold text-gray-300 tracking-wider">4 STEMS</span>
            </div>

            {/* Right: 5 model status — dashed upgrade button OR full cascade badge */}
            {hasCascade ? (
              <div className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-secondary/15 to-pink-500/10 border border-secondary/25 shadow-glow">
                <span className="text-[9px] font-mono font-bold text-secondary tracking-wider">5 STEMS · CASCADE</span>
                <span className="text-[9px]">⭐</span>
              </div>
            ) : isOwner ? (
              <button
                onClick={handleReprocess}
                disabled={isProcessingActive}
                className="group/rep flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-secondary/5 hover:bg-secondary/15 text-[9px] font-mono font-bold text-secondary border border-dashed border-secondary/40 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed hover:border-secondary/60 hover:shadow-glow"
              >
                <svg className="w-2.5 h-2.5 transition-transform group-hover/rep:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="tracking-wider">До 5 стемов</span>
              </button>
            ) : (
              <div />
            )}
          </div>
        ) : (
          <div className="mt-2.5 min-h-[28px]">
            <span className="inline-flex items-center text-[9px] font-mono italic text-gray-500">
              Нет стемов
            </span>
          </div>
        )}

        {/* Genres + BPM */}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap min-h-[24px]">
          {sortedGenres.length > 0 ? (
            sortedGenres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="text-[10px] font-semibold px-2 py-0.5 bg-background-deep/60 border border-border/60 text-gray-300 rounded-full transition-colors hover:border-primary/30 hover:text-primary"
              >
                {genre}
              </span>
            ))
          ) : (
            <span className="text-[10px] italic text-gray-500">Без жанра</span>
          )}
          {track.bpm && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full">
              <span className="opacity-70">♪</span>
              {track.bpm} BPM
            </span>
          )}
        </div>
      </div>

      {/* Actions Section */}
      <div className="relative flex-1 min-h-[110px] mt-4 flex flex-col justify-end gap-2.5">
        {isUnavailable && statusDetails ? (
          <div className="flex-1 flex flex-col justify-center p-3 rounded-xl bg-accent-red/[0.04] border border-accent-red/10 text-center animate-fade-in-scale">
            <p className="text-[10px] font-mono font-bold text-accent-red uppercase tracking-wider mb-1">
              {statusDetails.title}
            </p>
            <p className="text-[10px] text-gray-400 leading-normal">
              {statusDetails.description}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => !isActionsDisabled && setPlaylist([track], 0)}
              disabled={isActionsDisabled}
              className="group/btn relative px-3 py-2.5 bg-gradient-to-br from-primary to-primary-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-glow-primary active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:shadow-none overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
              <svg className="w-3.5 h-3.5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="relative z-10">Слушать</span>
            </button>

            <div className="relative w-full">
              {track.processed_models && track.processed_models.length > 1 ? (
                <>
                  <button
                    onClick={() => !isProcessingActive && setShowVersionMenu(!showVersionMenu)}
                    disabled={isProcessingActive}
                    className="w-full px-3 py-2.5 bg-gradient-to-br from-secondary to-secondary-hover text-white text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed shadow-glow"
                  >
                    В студию
                    <svg className={`w-2.5 h-2.5 transition-transform ${showVersionMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {showVersionMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowVersionMenu(false)} />
                      <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-background-surface border border-border-strong rounded-xl shadow-elevated overflow-hidden z-50 flex flex-col divide-y divide-border/60 animate-fade-in-up">
                        {track.processed_models.map((model) => (
                          <Link
                            key={model.task_id}
                            href={`/studio/${track.id}?task_id=${model.task_id}`}
                            onClick={() => setShowVersionMenu(false)}
                            className="px-3 py-2.5 text-[10px] font-mono text-left text-gray-200 hover:bg-background-deep hover:text-primary block transition"
                          >
                            <span className="inline-flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${model.model_name === 'cascade_guitar' ? 'bg-secondary shadow-glow' : 'bg-primary'}`} />
                              {model.model_name === 'cascade_guitar' ? '5 Stems · Cascade' : '4 Stems · HTDemucs'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Link
                  href={isProcessingActive ? '#' : `/studio/${track.id}${track.processed_models?.[0] ? `?task_id=${track.processed_models[0].task_id}` : ''}`}
                  className={`block w-full ${isProcessingActive ? 'pointer-events-none' : ''}`}
                >
                  <button
                    disabled={isProcessingActive}
                    className="w-full px-3 py-2.5 bg-gradient-to-br from-secondary to-secondary-hover text-white text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed shadow-glow"
                  >
                    В студию
                  </button>
                </Link>
              )}
            </div>

            <button
              onClick={() => !isUnavailable && onDownload(track.id)}
              disabled={isActionsDisabled}
              className="px-3 py-2.5 bg-background-elevated/50 hover:bg-background-deep border border-border/60 text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed hover:border-border-strong"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 10.5l4.5 4.5m0 0l4.5-4.5M12 15V3" />
              </svg>
              Скачать
            </button>

            {onEdit && isOwner ? (
              <button
                onClick={() => onEdit(track)}
                disabled={isProcessingActive}
                className="px-3 py-2.5 bg-background-elevated/50 hover:bg-background-deep border border-border/60 text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed hover:border-border-strong"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Инфо
              </button>
            ) : (
              <span className="px-3 py-2.5 bg-background-deep/40 text-gray-500 text-[9px] font-mono font-bold flex items-center justify-center rounded-xl border border-border/60">
                {!isOwner ? 'КАТАЛОГ' : 'НЕДОСТУПЕН'}
              </span>
            )}
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={() => onDelete(track.id)}
          disabled={isProcessingActive}
          className="w-full text-center text-[10px] font-mono font-bold text-gray-500 hover:text-accent-red hover:bg-accent-red/10 py-2 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed border border-transparent hover:border-accent-red/20"
        >
          Удалить из библиотеки
        </button>
      </div>
    </div>
  );
};
