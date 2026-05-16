'use client';

import React from 'react';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { Slider } from '@/shared/ui/Slider';

export const VolumeSlider = () => {
  const { volume, setVolume } = useAudioQueueStore();

  return (
    <div className="flex items-center gap-2 w-32">
      <span className="text-xs text-gray-400">Vol</span>
      <Slider 
        min={0} 
        max={1} 
        step={0.01} 
        value={volume} 
        onChange={setVolume} 
      />
    </div>
  );
};