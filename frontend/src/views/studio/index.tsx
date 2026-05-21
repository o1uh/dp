'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { TransportPanel } from '@/features/studio/TransportPanel';
import { MixerPanel } from '@/widgets/studio/MixerPanel';
import { AudioWorkspace } from '@/widgets/studio/AudioWorkspace';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { studioApi } from '@/entities/studio_session/api';
import { stemApi } from '@/entities/stem/api';
import { trackApi } from '@/entities/track/api';
import { getAudioContext } from '@/shared/lib/web-audio/context';

export const StudioView = ({ sessionId }: { sessionId: string }) => {
  const { initSession, projectName, setTracks, setTrackBuffer } = useStudioSessionStore();
  const stopSession = useStudioSessionStore(state => state.stop);
  const pauseGlobalPlayer = useAudioQueueStore(state => state.pause);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    pauseGlobalPlayer();

    const loadData = async () => {
      try {
        const data = await studioApi.loadSession(sessionId);
        if (!isMounted) return;

        initSession(sessionId, data.project_name);
        setTracks(data.tracks.map((t: any) => ({ ...t, buffer: null, nodes: null })));
        
        const ctx = getAudioContext();
        
        await Promise.all(data.tracks.map(async (track: any) => {
          try {
            let url = '';
            if (track.stem_id) {
              url = await stemApi.getDownloadUrl(track.stem_id);
            } else if (track.file_id) {
              url = await trackApi.getDownloadUrl(track.file_id);
            }
            
            if (url) {
              const response = await fetch(url);
              if (!response.ok) throw new Error(`S3 Error: ${response.status}`);
              const arrayBuffer = await response.arrayBuffer();
              
              try {
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                if (isMounted) {
                  setTrackBuffer(track.id, audioBuffer);
                }
              } catch (decodeError) {
                console.error(`Декодирование не удалось для ${track.name || track.id}`);
              }
            }
          } catch (e) {
            console.error(`Ошибка загрузки дорожки ${track.name || track.id}`, e);
          }
        }));

      } catch (e) {
        console.error('Ошибка сессии:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => { 
      isMounted = false;
      stopSession();
    };
  }, [sessionId, initSession, pauseGlobalPlayer, setTracks, setTrackBuffer, stopSession]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090D16]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <span className="text-xs font-mono tracking-wider text-gray-500 uppercase">ЗАГРУЗКА DAW ОКРУЖЕНИЯ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-white font-sans antialiased">
      {/* Шапка DAW */}
      <header className="h-11 bg-background-surface border-b border-slate-900 flex items-center justify-between px-4 select-none">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-accent-green" />
          <h1 className="text-xs font-bold tracking-wider text-gray-300 uppercase">{projectName}</h1>
        </div>
        <Link 
          href="/library" 
          className="text-[10px] font-mono font-bold tracking-wider text-gray-500 hover:text-white px-2.5 py-1 bg-slate-900 border border-white/[0.04] rounded transition"
        >
          ЗАКРЫТЬ СТУДИЮ [ESC]
        </Link>
      </header>
      
      {/* Главная панель транспорта (Время, Play, Loop, Export) */}
      <TransportPanel />
      
      {/* Рабочая область DAW (Микшер слева, Таймлайн со скроллом справа) */}
      <div className="flex flex-1 overflow-hidden">
        <MixerPanel />
        <AudioWorkspace />
      </div>
    </div>
  );
};