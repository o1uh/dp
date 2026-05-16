'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { PlaybackControls } from '@/features/audio_player/PlaybackControls';
import { VolumeSlider } from '@/features/audio_player/VolumeSlider';
import { AudioPlayer } from '@/shared/ui/AudioPlayer';
import { formatTime } from '@/shared/lib/formatting';

export const MiniPlayer = () => {
  const pathname = usePathname();
  const { playlist, currentIndex, currentTime, duration } = useAudioQueueStore();

  if (pathname.startsWith('/studio')) return null;
  if (currentIndex === -1 || !playlist[currentIndex]) return null;

  const currentTrack = playlist[currentIndex];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-6 z-50">
      <AudioPlayer />
      <div className="flex flex-col w-1/4">
        <span className="text-white font-semibold truncate">{currentTrack.title}</span>
        <span className="text-xs text-gray-400 truncate">{currentTrack.genre || 'Unknown genre'}</span>
      </div>
      <div className="flex flex-col items-center w-2/4 gap-2">
        <PlaybackControls />
        <div className="flex items-center gap-3 w-full max-w-lg">
          <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1 bg-slate-700 rounded-full relative">
            <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs text-gray-400 w-10 text-left">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="flex justify-end w-1/4">
        <VolumeSlider />
      </div>
    </div>
  );
};