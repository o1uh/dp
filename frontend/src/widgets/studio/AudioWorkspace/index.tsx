import React, { useEffect, useRef, useMemo } from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { Waveform } from '@/shared/ui/Waveform';

export const AudioWorkspace = () => {
  const { tracks, duration, currentTime, isPlaying } = useStudioSessionStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const PIXELS_PER_SECOND = 50; 
  
  const totalWidthPx = useMemo(() => {
    const audioWidth = duration * PIXELS_PER_SECOND;
    return Math.max(audioWidth + 200, 2000);
  }, [duration]);

  useEffect(() => {
    if (!isPlaying || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const playheadX = currentTime * PIXELS_PER_SECOND;
    const clientWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;

    if (playheadX > scrollLeft + clientWidth * 0.70) {
      container.scrollLeft = playheadX - clientWidth * 0.30;
    } else if (playheadX < scrollLeft) {
      container.scrollLeft = Math.max(0, playheadX - 50);
    }
  }, [currentTime, isPlaying]);

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 bg-slate-950 overflow-x-auto relative flex flex-col p-4 gap-2"
    >
      <div 
        className="relative flex flex-col gap-2 min-h-full"
        style={{ width: `${totalWidthPx}px` }}
      >
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 pointer-events-none" 
          style={{ left: `${currentTime * PIXELS_PER_SECOND}px` }} 
        />
        
        {tracks.map((track, idx) => {
          const offsetPx = (track.start_offset_ms / 1000) * PIXELS_PER_SECOND;
          const widthPx = track.buffer ? track.buffer.duration * PIXELS_PER_SECOND : 0;

          return (
            <div 
              key={track.id} 
              className="h-28 bg-slate-900 border border-slate-800 rounded relative w-full overflow-hidden"
            >
              {track.buffer && (
                <div 
                  className="absolute h-full" 
                  style={{ left: `${offsetPx}px`, width: `${widthPx}px` }}
                >
                  <Waveform buffer={track.buffer} color={idx % 2 === 0 ? '#1D4ED8' : '#9333EA'} height={110} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};