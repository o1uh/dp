'use client';

import React, { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { PlaybackControls } from '@/features/audio_player/PlaybackControls';
import { VolumeSlider } from '@/features/audio_player/VolumeSlider';
import { AudioPlayer } from '@/shared/ui/AudioPlayer';
import { formatTime } from '@/shared/lib/formatting';

export const MiniPlayer = () => {
  const pathname = usePathname();
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const { 
    playlist, 
    currentIndex, 
    currentTime, 
    duration, 
    setCurrentTime 
  } = useAudioQueueStore();

  if (pathname.startsWith('/studio')) return null;
  if (currentIndex === -1 || !playlist[currentIndex]) return null;

  const currentTrack = playlist[currentIndex];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration === 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickRatio = Math.max(0, Math.min(1, clickX / width));
    
    const targetTime = clickRatio * duration;
    
    const nativeAudio = document.querySelector('audio');
    if (nativeAudio) {
      nativeAudio.currentTime = targetTime;
    }
    setCurrentTime(targetTime);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-background-deep/95 border-t border-white/[0.06] backdrop-blur-2xl flex items-center justify-between px-6 z-50 select-none">
      <AudioPlayer />
      
      {/* Left: Track Info */}
      <div className="flex items-center gap-3 w-1/4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66A2.25 2.25 0 0018 12.553v-3.75" />
          </svg>
        </div>
        <div className="flex flex-col overflow-hidden min-w-0">
          <span className="text-xs font-bold text-gray-200 truncate">{currentTrack.title}</span>
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider truncate">
            {currentTrack.genre || 'Без жанра'}
          </span>
        </div>
      </div>

      {/* Center: Controls + Progress */}
      <div className="flex flex-col items-center w-2/4 gap-1.5">
        <PlaybackControls />
        
        <div className="flex items-center gap-3 w-full max-w-xl">
          <span className="text-[10px] font-mono text-gray-600 w-10 text-right leading-none tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div 
            ref={progressBarRef}
            onClick={handleScrub}
            className="flex-1 h-4 flex items-center cursor-pointer group"
          >
            <div className="w-full h-1 bg-slate-800/80 border border-white/[0.02] rounded-full relative overflow-hidden group-hover:h-1.5 transition-all">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-75" 
                style={{ width: `${progressPercent}%` }} 
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPercent}% - 6px)` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-mono text-gray-600 w-10 text-left leading-none tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume */}
      <div className="flex justify-end items-center w-1/4">
        <VolumeSlider />
      </div>
    </div>
  );
};