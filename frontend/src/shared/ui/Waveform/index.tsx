import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformProps {
  buffer: AudioBuffer | null;
  color?: string;
  height?: number;
  onReady?: () => void;
}

export const Waveform: React.FC<WaveformProps> = ({ buffer, color = '#1D4ED8', height = 80, onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: color,
      progressColor: '#9333EA',
      height,
      normalize: true,
      interact: false,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, [color, height]);

  useEffect(() => {
    if (!wavesurferRef.current || !buffer) return;

    setIsRendering(true);

    const worker = new Worker(new URL('@/shared/lib/workers/audio-decode.worker.ts', import.meta.url));
    const firstChannelData = buffer.getChannelData(0);
    
    worker.postMessage({ 
      channelData: firstChannelData, 
      samples: 8000 
    });

    worker.onmessage = (e) => {
      if (e.data.success) {
        wavesurferRef.current?.load('', [e.data.peaks], buffer.duration).then(() => {
          setIsRendering(false);
          if (onReady) onReady();
        });
      } else {
        setIsRendering(false);
      }
      worker.terminate();
    };

    worker.onerror = () => {
      setIsRendering(false);
      worker.terminate();
    };

    return () => {
      worker.terminate();
    };
  }, [buffer, onReady]);

  return (
    <div className="w-full relative h-full flex items-center justify-center">
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background-surface/40">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      <div ref={containerRef} className={`w-full ${isRendering ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} />
    </div>
  );
};