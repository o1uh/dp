import React, { useEffect, useRef } from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { Button } from '@/shared/ui/Button';
import { getAudioContext } from '@/shared/lib/web-audio/context';
import { formatTime } from '@/shared/lib/formatting';

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
    <div className="flex items-center justify-center gap-4 bg-slate-900 p-2 border-b border-slate-700">
      <span className="text-xl font-mono text-primary w-20 text-right">{formatTime(currentTime)}</span>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleStop}>◼</Button>
        <Button variant="primary" onClick={handleTogglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </Button>
        <Button variant={isLoop ? "primary" : "secondary"} onClick={toggleLoop}>
          🔁
        </Button>
      </div>
      <span className="text-xl font-mono text-gray-500 w-20">{formatTime(duration)}</span>
    </div>
  );
};