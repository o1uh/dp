'use client';

import React, { useEffect, useRef } from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { getAudioContext } from '@/shared/lib/web-audio/context';
import { formatTime } from '@/shared/lib/formatting';
import { ExportSession } from '@/features/studio/ExportSession';

export const TransportPanel = () => {
  const { isPlaying, isLoop, currentTime, duration, play, stop, toggleLoop, setCurrentTime, autoScrollEnabled, toggleAutoScroll } = useStudioSessionStore();
  const seekVersion = useStudioSessionStore(state => state.seekVersion);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, duration, isLoop, seekVersion]);

  return (
    <div className="flex items-center justify-between h-14 bg-background-surface/80 border-b border-white/[0.04] px-6 select-none backdrop-blur-md">
      {/* Timecode display */}
      <div className="w-1/3 flex items-center">
        <div className="bg-background-deep border border-white/[0.04] rounded-xl px-4 py-1.5 flex items-baseline gap-2 shadow-inner">
          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">TIME</span>
          <span className="text-xl font-mono font-bold tracking-widest text-primary leading-none tabular-nums">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>
      
      {/* Transport controls */}
      <div className="flex gap-1.5 justify-center items-center w-1/3">
        {/* STOP */}
        <button 
          onClick={handleStop}
          className="w-9 h-9 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 border border-white/[0.04] hover:border-white/[0.08] text-gray-500 hover:text-white transition flex items-center justify-center active:scale-90"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1.5" />
          </svg>
        </button>

        {/* PLAY / PAUSE */}
        {isPlaying ? (
          <button 
            onClick={handleTogglePlay}
            className="w-11 h-11 rounded-xl bg-primary hover:bg-primary-hover text-white transition flex items-center justify-center shadow-glow-primary active:scale-90"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
        ) : (
          <button 
            onClick={handleTogglePlay}
            className="w-11 h-11 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 border border-primary/25 transition flex items-center justify-center active:scale-90"
          >
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {/* LOOP */}
        <button 
          onClick={toggleLoop}
          className={`w-9 h-9 rounded-xl border transition flex items-center justify-center active:scale-90 ${
            isLoop 
              ? 'bg-secondary/15 text-secondary border-secondary/30 shadow-glow' 
              : 'bg-slate-900/50 hover:bg-slate-800/50 border-white/[0.04] hover:border-white/[0.08] text-gray-500 hover:text-white'
          }`}
          title={isLoop ? "Петля включена" : "Петля выключена"}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
        </button>

        {/* AUTO-SCROLL */}
        <button 
          onClick={toggleAutoScroll}
          className={`w-9 h-9 rounded-xl border transition flex items-center justify-center active:scale-90 ${
            autoScrollEnabled 
              ? 'bg-primary/15 text-primary border-primary/30 shadow-glow-primary' 
              : 'bg-slate-900/50 hover:bg-slate-800/50 border-white/[0.04] hover:border-white/[0.08] text-gray-500 hover:text-white'
          }`}
          title={autoScrollEnabled ? "Автопрокрутка включена" : "Автопрокрутка выключена"}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Duration + Export */}
      <div className="flex w-1/3 justify-end items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">TOTAL</span>
          <span className="text-sm font-mono text-gray-400 tabular-nums">{formatTime(duration)}</span>
        </div>
        <ExportSession />
      </div>
    </div>
  );
};