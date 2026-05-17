'use client';

import React, { useEffect, useState } from 'react';
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
        data.tracks.forEach(async (track: any) => {
          try {
            let url = '';
            if (track.stem_id) {
              url = await stemApi.getDownloadUrl(track.stem_id);
            } else if (track.file_id) {
              url = await trackApi.getDownloadUrl(track.file_id);
            }
            
            if (url) {
              const response = await fetch(url);
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              
              if (isMounted) {
                setTrackBuffer(track.id, audioBuffer);
              }
            }
          } catch (e) {
            console.error(`Failed to decode track ${track.id}`, e);
          }
        });

      } catch (e) {
        console.error('Failed to load session data:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [sessionId, initSession, pauseGlobalPlayer, setTracks, setTrackBuffer]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="text-primary animate-pulse font-semibold">Загрузка данных сессии...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-white font-bold">{projectName}</h1>
      </header>
      
      <TransportPanel />
      
      <div className="flex flex-1 overflow-hidden">
        <MixerPanel />
        <AudioWorkspace />
      </div>
    </div>
  );
};