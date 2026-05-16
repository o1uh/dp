import React from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { Waveform } from '@/shared/ui/Waveform';

export const AudioWorkspace = () => {
  const { tracks, duration, currentTime } = useStudioSessionStore();
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const PIXELS_PER_SECOND = 50; 

  return (
    <div className="flex-1 bg-slate-950 overflow-x-auto relative flex flex-col p-4 gap-2">
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none" 
        style={{ left: `calc(1rem + ${currentTime * PIXELS_PER_SECOND}px)` }} 
      />
      
      {tracks.map((track, idx) => {
        const offsetPx = (track.start_offset_ms / 1000) * PIXELS_PER_SECOND;
        const widthPx = track.buffer ? track.buffer.duration * PIXELS_PER_SECOND : 0;

        return (
          <div key={track.id} className="h-24 bg-slate-900 border border-slate-800 rounded relative w-full min-w-max">
            <div 
              className="absolute h-full" 
              style={{ left: `${offsetPx}px`, width: widthPx > 0 ? `${widthPx}px` : '100%' }}
            >
              <Waveform buffer={track.buffer} color={idx % 2 === 0 ? '#1D4ED8' : '#9333EA'} />
            </div>
          </div>
        );
      })}
    </div>
  );
};