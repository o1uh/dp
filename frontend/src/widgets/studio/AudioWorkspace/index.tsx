import React, { useRef, useMemo, useEffect } from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { Waveform } from '@/shared/ui/Waveform';

export const AudioWorkspace = () => {
  const { tracks, duration, currentTime, isPlaying, seekTo, autoScrollEnabled } = useStudioSessionStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  
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

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const currentScroll = scrollContainerRef.current.scrollLeft;
      if (rulerContainerRef.current) {
        rulerContainerRef.current.scrollLeft = currentScroll;
      }

      // Детектируем ручной скролл только если автошаг включен
      if (isPlaying && autoScrollEnabled && Math.abs(currentScroll - lastAutoScrollPosRef.current) > 3) {
        isAutoScrollRef.current = false;
      }
    }
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
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    seekTo(clickX / PIXELS_PER_SECOND);
  };

  const getStemColor = (trackName: string = ''): string => {
    const lowerName = trackName.toLowerCase();
    if (lowerName.includes('vocal')) return '#EC4899'; // Розовый
    if (lowerName.includes('drum')) return '#06B6D4';  // Бирюзовый
    if (lowerName.includes('bass')) return '#10B981';  // Зеленый
    if (lowerName.includes('guitar')) return '#F59E0B'; // Оранжево-желтый
    return '#8B5CF6'; // Фиолетовый для "Other"
  };

  return (
    <div className="flex-1 bg-[#090D16] flex flex-col overflow-hidden relative select-none">
      {/* Линейка времени (Ruler) */}
      <div 
        ref={rulerContainerRef}
        className="h-10 border-b border-slate-900 bg-[#05070B] overflow-hidden relative shrink-0"
      >
        <div 
          className="absolute top-0 bottom-0 left-0 cursor-pointer" 
          style={{ width: `${totalWidthPx}px` }}
          onClick={handleRulerClick}
        >
          {timeTicks.map((tick) => (
            <div 
              key={tick} 
              className="absolute top-0 bottom-0 border-l border-white/[0.04] flex flex-col justify-end pb-1 pl-1"
              style={{ left: `${tick * PIXELS_PER_SECOND}px` }}
            >
              <span className="text-[9px] font-mono text-gray-500 leading-none">
                {tick}s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Контейнер аудио-дорожек */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto overflow-y-auto relative p-4 flex flex-col gap-4"
      >
        <div 
          className="relative flex flex-col gap-4 min-h-full cursor-pointer"
          style={{ width: `${totalWidthPx}px` }}
          onClick={handleTracksClick}
        >
          {/* Вертикальный playhead-курсор времени */}
          <div 
            className="absolute top-0 bottom-0 w-[1.5px] bg-primary z-30 pointer-events-none" 
            style={{ 
              left: `${currentTime * PIXELS_PER_SECOND}px`,
              boxShadow: '0 0 8px #3B82F6'
            }} 
          />
          
          {tracks.map((track) => {
            const offsetPx = (track.start_offset_ms / 1000) * PIXELS_PER_SECOND;
            const widthPx = track.buffer ? track.buffer.duration * PIXELS_PER_SECOND : 0;
            const waveColor = getStemColor(track.name);

            return (
              <div 
                key={track.id} 
                className="h-[150px] bg-background-surface/20 border border-white/[0.02] rounded-lg relative w-full overflow-hidden"
              >
                {track.buffer ? (
                  <div 
                    className="absolute h-full bg-[#121824]/60 rounded border-l-2" 
                    style={{ 
                      left: `${offsetPx}px`, 
                      width: `${widthPx}px`,
                      borderColor: waveColor
                    }}
                  >
                    <Waveform buffer={track.buffer} color={waveColor} height={148} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">НЕТ ДАННЫХ ДОРОЖКИ</span>
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