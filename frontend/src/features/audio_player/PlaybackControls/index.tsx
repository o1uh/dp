'use client';

import React from 'react';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { Button } from '@/shared/ui/Button';

export const PlaybackControls = () => {
  const { isPlaying, play, pause, prevTrack, nextTrack, playlist, currentIndex } = useAudioQueueStore();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < playlist.length - 1 && currentIndex >= 0;

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" className="px-3 py-1 text-sm" onClick={prevTrack} disabled={!hasPrev}>
        |◀
      </Button>
      
      {isPlaying ? (
        <Button variant="primary" className="px-4 py-1 text-sm font-bold" onClick={pause}>
          ||
        </Button>
      ) : (
        <Button variant="primary" className="px-4 py-1 text-sm font-bold" onClick={play}>
          ▶
        </Button>
      )}
      
      <Button variant="secondary" className="px-3 py-1 text-sm" onClick={nextTrack} disabled={!hasNext}>
        ▶|
      </Button>
    </div>
  );
};