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
              
              if (!response.ok) {
                throw new Error(`S3 Error: ${response.status}`);
              }
              
              const arrayBuffer = await response.arrayBuffer();
              
              try {
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                if (isMounted) {
                  setTrackBuffer(track.id, audioBuffer);
                }
              } catch (decodeError) {
                console.error(`Decoding failed for ${track.name || track.id}. Likely FLAC/format issue.`);
              }
            }
          } catch (e) {
            console.error(`Failed to load track ${track.name || track.id}`, e);
          }
        }));

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
      <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
        <h1 className="text-white font-bold">{projectName}</h1>
        <Link 
          href="/library" 
          className="text-sm font-semibold text-gray-400 hover:text-white px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded transition"
        >
          ✕ Выйти
        </Link>
      </header>
      
      <TransportPanel />
      
      <div className="flex flex-1 overflow-hidden">
        <MixerPanel />
        <AudioWorkspace />
      </div>
    </div>
  );
};