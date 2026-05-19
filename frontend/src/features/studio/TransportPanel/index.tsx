import React, { useEffect, useRef } from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { Button } from '@/shared/ui/Button';
import { getAudioContext } from '@/shared/lib/web-audio/context';
import { formatTime } from '@/shared/lib/formatting';
import { ExportSession } from '@/features/studio/ExportSession';

export const TransportPanel = () => {
  const { isPlaying, isLoop, currentTime, duration, play, stop, toggleLoop, setCurrentTime } = useStudioSessionStore();
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  const handleTogglePlay = () => isPlaying ? stop() : play();

  const handleStop = () => {
    stop();
    setCurrentTime(0);
  };

  useEffect(() => {
    const ctx = getAudioContext();
    if (isPlaying) {
      startTimeRef.current = ctx.currentTime - currentTime;
      const updateTime = () => {
        const newTime = ctx.currentTime - startTimeRef.current;
        if (newTime >= duration) {
          if (isLoop) {
            startTimeRef.current = ctx.currentTime;
            setCurrentTime(0);
            animationRef.current = requestAnimationFrame(updateTime);
          } else {
            handleStop();
          }
        } else {
          setCurrentTime(newTime);
          animationRef.current = requestAnimationFrame(updateTime);
        }
      };
      animationRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, duration, isLoop]);

  return (
    <div className="flex items-center justify-between bg-slate-900 p-2 border-b border-slate-700 px-4">
      <div className="w-1/3">
          <span className="text-xl font-mono text-primary">{formatTime(currentTime)}</span>
      </div>
      
      <div className="flex gap-2 justify-center w-1/3">
        <Button variant="secondary" onClick={handleStop}>◼</Button>
        <Button variant="primary" onClick={handleTogglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </Button>
        <Button variant={isLoop ? "primary" : "secondary"} onClick={toggleLoop}>
          🔁
        </Button>
      </div>
      
      <div className="flex w-1/3 justify-end items-center gap-4">
        <span className="text-xl font-mono text-gray-500">{formatTime(duration)}</span>
        <ExportSession />
      </div>
    </div>
  );
};