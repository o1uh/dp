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
    if (!containerRef.current) {
      console.warn("[WAVEFORM UI] Container reference missing. Instantiation suspended.");
      return;
    }

    console.log(`[WAVEFORM UI] Instantiating WaveSurfer canvas... Color: '${color}', Height: ${height}px`);
    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: color,
      progressColor: '#9333EA',
      height,
      normalize: true,
      interact: false,
    });
    console.log("[WAVEFORM UI] WaveSurfer canvas successfully created.");

    return () => {
      console.log("[WAVEFORM UI] Destroying WaveSurfer instance...");
      wavesurferRef.current?.destroy();
    };
  }, [color, height]);

  useEffect(() => {
    if (!wavesurferRef.current) {
      console.warn("[WAVEFORM UI] Skipping buffer load. WaveSurfer context not initialized.");
      return;
    }
    if (!buffer) {
      console.warn("[WAVEFORM UI] Skipping buffer load. Received buffer payload is empty.");
      return;
    }

    console.log(`[WAVEFORM UI] Audio buffer detected. Spawning audio-decode.worker for fast peaks extraction. Buffer duration: ${buffer.duration}s`);
    setIsRendering(true);

    const worker = new Worker(new URL('@/shared/lib/workers/audio-decode.worker.ts', import.meta.url));
    const firstChannelData = buffer.getChannelData(0);
    
    console.log(`[WAVEFORM UI] Dispatching first channel payload array. Length: ${firstChannelData.length} samples`);
    worker.postMessage({ 
      channelData: firstChannelData, 
      samples: 8000 
    });

    worker.onmessage = (e) => {
      console.log("[WAVEFORM UI] Message received back from audio-decode.worker. Success state:", e.data.success);
      if (e.data.success) {
        console.log(`[WAVEFORM UI] Peaks successfully calculated. Loading waveforms into WaveSurfer instance. Peaks count: ${e.data.peaks.length}`);
        wavesurferRef.current?.load('', [e.data.peaks], buffer.duration).then(() => {
          console.log("[WAVEFORM UI] WaveSurfer rendering process completed.");
          setIsRendering(false);
          if (onReady) {
            console.log("[WAVEFORM UI] Invoking onReady notification callback...");
            onReady();
          }
        });
      } else {
        console.error("[WAVEFORM UI ERROR] Worker failed internal peak calculations:", e.data.error);
        setIsRendering(false);
      }
      console.log("[WAVEFORM UI] Terminating background audio-decode.worker thread...");
      worker.terminate();
    };

    worker.onerror = (err) => {
      console.error('[WAVEFORM UI ERROR] Uncaught error inside background decoding thread. Terminating worker...', err);
      setIsRendering(false);
      worker.terminate();
    };

    return () => {
      console.log("[WAVEFORM UI] Component cleanup active. Forcing background thread termination...");
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