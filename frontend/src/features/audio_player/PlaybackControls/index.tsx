'use client';

import React from 'react';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';

export const PlaybackControls = () => {
  const { isPlaying, play, pause, prevTrack, nextTrack, playlist, currentIndex } = useAudioQueueStore();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < playlist.length - 1 && currentIndex >= 0;

  return (
    <div className="flex items-center gap-2">
      {/* Кнопка: Назад */}
      <button
        onClick={prevTrack}
        disabled={!hasPrev}
        className="w-9 h-9 rounded-lg bg-slate-950 hover:bg-slate-900 border border-white/[0.04] text-gray-400 hover:text-white transition flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6L18 6v12z" />
        </svg>
      </button>
      
      {/* Кнопка: Воспроизведение / Пауза */}
      {isPlaying ? (
        <button
          onClick={pause}
          aria-label="Пауза"
          className="w-11 h-11 rounded-lg bg-primary hover:bg-primary-hover text-white transition flex items-center justify-center shadow-glow-primary active:scale-95"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={play}
          aria-label="Воспроизвести"
          className="w-11 h-11 rounded-lg bg-primary hover:bg-primary-hover text-white transition flex items-center justify-center shadow-glow-primary active:scale-95"
        >
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
      
      {/* Кнопка: Вперед */}
      <button
        onClick={nextTrack}
        disabled={!hasNext}
        className="w-9 h-9 rounded-lg bg-slate-950 hover:bg-slate-900 border border-white/[0.04] text-gray-400 hover:text-white transition flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6zm9-12v12h2V6z" />
        </svg>
      </button>
    </div>
  );
};