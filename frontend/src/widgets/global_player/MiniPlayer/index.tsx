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
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#05070b]/90 border-t border-white/[0.06] backdrop-blur-xl flex items-center justify-between px-8 z-50 select-none">
      <AudioPlayer />
      
      {/* Левый блок: Информация */}
      <div className="flex items-center gap-4 w-1/4">
        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-white/[0.06] flex items-center justify-center">
          <svg className="w-5 h-5 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-bold text-gray-200 truncate">{currentTrack.title}</span>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest truncate">
            {currentTrack.genre || 'GENRE_NOT_DEFINED'}
          </span>
        </div>
      </div>

      {/* Центральный блок: Управление и перемотка */}
      <div className="flex flex-col items-center w-2/4 gap-2">
        <PlaybackControls />
        
        <div className="flex items-center gap-4 w-full max-w-xl">
          <span className="text-[10px] font-mono text-gray-500 w-10 text-right leading-none">
            {formatTime(currentTime)}
          </span>
          <div 
            ref={progressBarRef}
            onClick={handleScrub}
            className="flex-1 h-3 flex items-center cursor-pointer group"
          >
            <div className="w-full h-1 bg-slate-900 border border-white/[0.02] rounded-full relative overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-100" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
          <span className="text-[10px] font-mono text-gray-500 w-10 text-left leading-none">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Правый блок: Громкость (Лишняя рамка убрана, прямое выравнивание) */}
      <div className="flex justify-end items-center w-1/4 pr-2">
        <VolumeSlider />
      </div>
    </div>
  );
};