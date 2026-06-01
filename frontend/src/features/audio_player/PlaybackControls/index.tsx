'use client';

import React from 'react';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';

export const PlaybackControls = () => {
  const { isPlaying, play, pause, prevTrack, nextTrack, playlist, currentIndex } = useAudioQueueStore();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < playlist.length - 1 && currentIndex >= 0;

  return (
    <div className="flex items-center gap-1.5">
      {/* Prev */}
      <button
        onClick={prevTrack}
        disabled={!hasPrev}
        className="w-8 h-8 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-500 hover:text-white transition flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none active:scale-90"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.5v11L9.5 12 19 6.5zM7 6v12H5V6h2z" />
        </svg>
      </button>
      
      {/* Play / Pause */}
      {isPlaying ? (
        <button
          onClick={pause}
          aria-label="Пауза"
          className="w-9 h-9 rounded-xl bg-primary hover:bg-primary-hover text-white transition flex items-center justify-center shadow-glow-primary active:scale-90"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={play}
          aria-label="Воспроизвести"
          className="w-9 h-9 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 border border-primary/25 transition flex items-center justify-center active:scale-90"
        >
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
      
      {/* Next */}
      <button
        onClick={nextTrack}
        disabled={!hasNext}
        className="w-8 h-8 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-500 hover:text-white transition flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none active:scale-90"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 6.5v11L14.5 12 5 6.5zM17 6v12h2V6h-2z" />
        </svg>
      </button>
    </div>
  );
};