'use client';

import React from 'react';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { Slider } from '@/shared/ui/Slider';

export const VolumeSlider = () => {
  const { volume, setVolume } = useAudioQueueStore();

  const handleMuteToggle = () => {
    setVolume(volume > 0 ? 0 : 0.5);
  };

  return (
    <div className="flex items-center gap-2.5 w-32 select-none h-5 group">
      {/* Speaker icon */}
      <button 
        onClick={handleMuteToggle}
        className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-gray-500 hover:text-white transition outline-none"
        title="Громкость"
      >
        {volume === 0 ? (
          <svg className="w-4 h-4 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : volume < 0.5 ? (
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
          </svg>
        )}
      </button>
      
      {/* Slider */}
      <div className="flex-1 flex items-center h-full">
        <Slider 
          min={0} 
          max={1} 
          step={0.01} 
          value={volume} 
          onChange={setVolume} 
          className="h-1"
        />
      </div>
    </div>
  );
};