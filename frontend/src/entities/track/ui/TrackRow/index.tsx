'use client';

import React, { useState } from 'react';
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
    <div className={`group bg-background-surface border rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition duration-300 relative ${isOrphaned ? 'opacity-50 border-accent-red/25 bg-red-950/5' : 'border-white/[0.04]'}`}>
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            {new Date(track.created_at).toLocaleDateString('ru-RU')}
          </span>
          <div className="flex items-center gap-1.5">
            {!isOwner && (
              <span className="text-[9px] font-mono font-black text-secondary uppercase tracking-wider">
                Каталог
              </span>
            )}
            <span className={`w-1.5 h-1.5 rounded-full ${track.visibility === 'public' ? 'bg-accent-green' : 'bg-gray-600'}`} />
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">{track.visibility}</span>
          </div>
        </div>

        <h3 className={`text-sm font-bold truncate transition duration-200 ${isOrphaned ? 'text-gray-500 line-through' : 'text-gray-100 group-hover:text-primary'}`}>
          {track.title}
        </h3>

        {/* Доступные версии обработки / Статус обработки в реальном времени */}
        <div className="mt-2 flex gap-1 flex-wrap min-h-[22px] items-center">
          {isProcessingActive ? (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/25 animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow animate-ping" />
              ОБРАБАТЫВАЕТСЯ AI...
            </span>
          ) : (
            <>
              {hasHtdemucs && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-gray-400 border border-white/[0.04]">
                  4 STEMS
                </span>
              )}
              {hasCascade && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/25">
                  5 STEMS (CASCADE)
                </span>
              )}
              {/* Компактный интерактивный бейдж дообработки */}
              {isOwner && !isOrphaned && hasHtdemucs && !hasCascade && (
                <button
                  onClick={handleReprocess}
                  disabled={isProcessingActive}
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 transition flex items-center gap-1 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  title="Запустить премиум-каскад на 5 стемов без повторной загрузки файла"
                >
                  {isReprocessing ? (
                    <div className="w-2.5 h-2.5 rounded-full border border-secondary/20 border-t-secondary animate-spin" />
                  ) : (
                    '⭐ ДООБРАБОТАТЬ ДО 5 СТЕМОВ'
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {isOrphaned ? (
          <div className="mt-3 text-[10px] font-mono font-black text-accent-red uppercase tracking-wider">
            Файл больше не доступен
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {track.genre ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-900 border border-white/[0.04] text-gray-300 rounded-full">
                {track.genre}
              </span>
            ) : (
              <span className="text-[10px] italic text-gray-600">Без жанра</span>
            )}
            {track.bpm && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-900 border border-white/[0.04] text-primary rounded-full">
                {track.bpm} BPM
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1.5 relative">
        <button 
          onClick={() => !isOrphaned && setPlaylist([track], 0)}
          disabled={isOrphaned || isProcessingActive}
          className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-glow-primary active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Слушать
        </button>
        
        {isOrphaned ? (
          <button 
            disabled 
            className="px-3 py-1.5 bg-slate-900 border border-white/[0.04] text-gray-600 text-xs font-bold rounded-lg opacity-40 cursor-not-allowed"
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
                  className="w-full px-3 py-1.5 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-lg transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
                >
                  В студию ▾
                </button>
                
                {showVersionMenu && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#0f1422] border border-white/[0.08] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col divide-y divide-white/[0.04]">
                    {track.processed_models.map((model) => (
                      <Link 
                        key={model.task_id} 
                        href={`/studio/${track.id}?task_id=${model.task_id}`}
                        onClick={() => setShowVersionMenu(false)}
                        className="p-2 text-[10px] font-mono text-left text-gray-300 hover:bg-white/[0.02] hover:text-white block transition"
                      >
                        {model.model_name === 'cascade_guitar' ? '⭐ 5 Stems' : '4 Stems'}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link 
                href={isProcessingActive ? '#' : `/studio/${track.id}${track.processed_models?.[0] ? `?task_id=${track.processed_models[0].task_id}` : ''}`} 
                className={`w-full ${isProcessingActive ? 'pointer-events-none' : ''}`}
              >
                <button 
                  disabled={isProcessingActive}
                  className="w-full px-3 py-1.5 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-lg transition active:scale-95 disabled:opacity-30"
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
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/[0.04] text-gray-300 text-xs font-semibold rounded-lg transition disabled:opacity-20 disabled:pointer-events-none"
        >
          Скачать
        </button>
        
        {onEdit && isOwner && !isOrphaned ? (
          <button 
            onClick={() => onEdit(track)}
            disabled={isProcessingActive}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/[0.04] text-gray-300 text-xs font-semibold rounded-lg transition disabled:opacity-30"
          >
            Инфо
          </button>
        ) : (
          <span className="px-3 py-1.5 bg-slate-950 text-gray-600 text-[10px] font-mono font-bold flex items-center justify-center rounded-lg border border-white/[0.02]">
            {!isOwner ? 'КАТАЛОГ' : 'НЕДОСТУПЕН'}
          </span>
        )}
        
        <button 
          onClick={() => onDelete(track.id)}
          disabled={isProcessingActive}
          className="col-span-2 mt-1 px-3 py-1 text-center text-[10px] font-mono font-semibold text-gray-500 hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition disabled:opacity-30 disabled:pointer-events-none"
        >
          УДАЛИТЬ ИЗ БИБЛИОТЕКИ
        </button>
      </div>
    </div>
  );
};