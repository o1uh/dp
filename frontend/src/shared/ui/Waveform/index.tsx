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
    });

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, [color, height]);

  useEffect(() => {
    if (!wavesurferRef.current || !buffer) return;

    setIsRendering(true);

    const worker = new Worker(new URL('@/shared/lib/workers/audio-decode.worker.ts', import.meta.url));
    
    worker.postMessage({ 
      channelData: buffer.getChannelData(0), 
      samples: 8000 
    });

    worker.onmessage = (e) => {
      if (e.data.success) {
        wavesurferRef.current?.load('', [e.data.peaks], buffer.duration).then(() => {
          setIsRendering(false);
          if (onReady) onReady();
        });
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      setIsRendering(false);
      worker.terminate();
    };

    return () => {
      worker.terminate();
    };
  }, [buffer, onReady]);

  return (
    <div className="w-full relative h-full flex items-center justify-center">
      {isRendering && <span className="absolute text-xs text-primary animate-pulse z-10">Рендеринг...</span>}
      <div ref={containerRef} className={`w-full ${isRendering ? 'opacity-0' : 'opacity-100'}`} />
    </div>
  );
};