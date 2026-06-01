import React, { useRef, useMemo, useEffect } from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { Waveform } from '@/shared/ui/Waveform';

interface AudioWorkspaceProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const AudioWorkspace: React.FC<AudioWorkspaceProps> = ({ scrollRef, onScroll }) => {
  const { tracks, duration, currentTime, isPlaying, seekTo, autoScrollEnabled } = useStudioSessionStore();
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = scrollRef;
  
  const isAutoScrollRef = useRef(true);
  const lastAutoScrollPosRef = useRef(0);
  
  const PIXELS_PER_SECOND = 40; 
  
  const totalWidthPx = useMemo(() => {
    const audioWidth = duration * PIXELS_PER_SECOND;
    return Math.max(audioWidth + 100, 1600);
  }, [duration]);

  const timeTicks = useMemo(() => {
    const ticks = [];
    const step = 5; 
    const limit = Math.ceil(totalWidthPx / PIXELS_PER_SECOND);
    for (let i = 0; i <= limit; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [totalWidthPx]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) {
      const currentScroll = scrollContainerRef.current.scrollLeft;
      if (rulerContainerRef.current) {
        rulerContainerRef.current.scrollLeft = currentScroll;
      }
      if (isPlaying && autoScrollEnabled && Math.abs(currentScroll - lastAutoScrollPosRef.current) > 3) {
        isAutoScrollRef.current = false;
      }
    }
    onScroll(e); // Синхронизация вертикальной прокрутки с MixerPanel
  };

  useEffect(() => {
    if (isPlaying) {
      isAutoScrollRef.current = true;
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || !scrollContainerRef.current || !autoScrollEnabled) return;

    const container = scrollContainerRef.current;
    const playheadX = currentTime * PIXELS_PER_SECOND;
    const viewportWidth = container.clientWidth;
    const threshold = viewportWidth * 0.75; 
    
    const relativeX = playheadX - container.scrollLeft;

    if (relativeX <= threshold) {
      isAutoScrollRef.current = true;
    } else if (relativeX > threshold && isAutoScrollRef.current) {
      const targetScrollLeft = playheadX - threshold;
      container.scrollLeft = targetScrollLeft;
      lastAutoScrollPosRef.current = targetScrollLeft;
    }
  }, [currentTime, isPlaying, autoScrollEnabled]);

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    seekTo(clickX / PIXELS_PER_SECOND);
  };

  const handleTracksClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    seekTo(clickX / PIXELS_PER_SECOND);
  };

  const getStemColor = (trackName: string = ''): string => {
    const lowerName = trackName.toLowerCase();
    if (lowerName.includes('vocal')) return '#EC4899';
    if (lowerName.includes('drum')) return '#06B6D4';
    if (lowerName.includes('bass')) return '#10B981';
    if (lowerName.includes('guitar')) return '#F59E0B';
    return '#8B5CF6';
  };

  return (
    <div className="flex-1 bg-background flex flex-col overflow-hidden relative select-none h-full">
      {/* Ruler */}
      <div 
        ref={rulerContainerRef}
        className="h-10 border-b border-border bg-background-deep overflow-hidden relative shrink-0"
      >
        <div 
          className="absolute top-0 bottom-0 left-0 cursor-pointer" 
          style={{ width: `${totalWidthPx}px` }}
          onClick={handleRulerClick}
        >
          {timeTicks.map((tick) => (
            <div 
              key={tick} 
              className="absolute top-0 bottom-0 border-l border-border flex flex-col justify-end pb-1 pl-1.5"
              style={{ left: `${tick * PIXELS_PER_SECOND}px` }}
            >
              <span className="text-[9px] font-mono text-gray-500 leading-none tabular-nums">
                {tick}s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tracks container (both vertical & horizontal scrolling active) */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto relative py-4 px-4 flex flex-col"
      >
        <div 
          className="relative flex flex-col gap-4 cursor-pointer min-h-full"
          style={{ width: `${totalWidthPx}px` }}
          onClick={handleTracksClick}
        >
          {/* Playhead — stretches completely from first to last track inside container */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-primary z-30 pointer-events-none" 
            style={{ 
              left: `${currentTime * PIXELS_PER_SECOND}px`,
              boxShadow: '0 0 10px #3B82F6, 0 0 20px #3B82F6'
            }} 
          />
          
          {tracks.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <span className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">НЕТ ЗАГРУЖЕННЫХ ДОРОЖЕК</span>
            </div>
          )}

          {tracks.map((track) => {
            const offsetPx = (track.start_offset_ms / 1000) * PIXELS_PER_SECOND;
            const widthPx = track.buffer ? track.buffer.duration * PIXELS_PER_SECOND : 0;
            const waveColor = getStemColor(track.name);

            return (
              <div 
                key={track.id} 
                className="h-[140px] bg-background-surface/10 border border-border rounded-lg relative w-full overflow-hidden transition-all duration-200 flex-shrink-0"
              >
                {track.buffer ? (
                  <div 
                    className="absolute h-full bg-background-surface/40 rounded-lg border-l-[3px]" 
                    style={{ 
                      left: `${offsetPx}px`, 
                      width: `${widthPx}px`,
                      borderColor: waveColor
                    }}
                  >
                    <Waveform buffer={track.buffer} color={waveColor} height={138} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">НЕТ ДАННЫХ</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};