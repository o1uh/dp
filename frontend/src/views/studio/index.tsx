'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { useUserStore } from '@/entities/user/model/store'; 
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { TransportPanel } from '@/features/studio/TransportPanel';
import { MixerPanel } from '@/widgets/studio/MixerPanel';
import { AudioWorkspace } from '@/widgets/studio/AudioWorkspace';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { studioApi } from '@/entities/studio_session/api';
import { stemApi } from '@/entities/stem/api';
import { trackApi } from '@/entities/track/api';
import { getAudioContext } from '@/shared/lib/web-audio/context';

export const StudioView = ({ sessionId, taskId }: { sessionId: string; taskId?: string | null }) => {
  const { initSession, projectName, setTracks, setTrackBuffer } = useStudioSessionStore();
  const stopSession = useStudioSessionStore(state => state.stop);
  const pauseGlobalPlayer = useAudioQueueStore(state => state.pause);
  const [isLoading, setIsLoading] = useState(true);

  const { isAuth, _hasHydrated } = useUserStore();
  const router = useRouter();

  // Ссылки для синхронизации скролла
  const mixerScrollRef = useRef<HTMLDivElement>(null);
  const workspaceScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const handleMixerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    if (workspaceScrollRef.current) {
      workspaceScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    requestAnimationFrame(() => {
      isScrollingRef.current = false;
    });
  };

  const handleWorkspaceScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    if (mixerScrollRef.current) {
      mixerScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    requestAnimationFrame(() => {
      isScrollingRef.current = false;
    });
  };

  useEffect(() => {
    if (_hasHydrated && !isAuth) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuth, router]);

  useEffect(() => {
    if (!isAuth) return;

    let isMounted = true;
    pauseGlobalPlayer();

    const loadData = async () => {
      try {
        const data = await studioApi.loadSession(sessionId, taskId);
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

      } catch (e: any) {
        console.error('Ошибка сессии:', e);
        if (e.response?.status === 401 || e.response?.status === 403) {
          router.replace('/library');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => { 
      isMounted = false;
      stopSession();
    };
  }, [sessionId, taskId, initSession, pauseGlobalPlayer, setTracks, setTrackBuffer, stopSession, isAuth, router]);

  if (!_hasHydrated || !isAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">ПРОВЕРКА АВТОРИЗАЦИИ...</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-secondary/20 border-b-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
          </div>
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">ЗАГРУЗКА DAW...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-white font-sans antialiased">
      {/* DAW Header */}
      <header className="h-10 bg-background-deep border-b border-border flex items-center justify-between px-4 select-none flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
          </div>
          <h1 className="text-xs font-bold tracking-wider text-gray-300 uppercase">{projectName}</h1>
        </div>
        <Link 
          href="/library" 
          className="text-[10px] font-mono font-bold tracking-wider text-gray-400 hover:text-gray-100 px-3 py-1.5 bg-background-elevated hover:bg-background-deep border border-border hover:border-border-strong rounded-lg transition"
        >
          ✕ Закрыть
        </Link>
      </header>
      
      {/* Transport */}
      <TransportPanel />
      
      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <MixerPanel scrollRef={mixerScrollRef} onScroll={handleMixerScroll} />
        <AudioWorkspace scrollRef={workspaceScrollRef} onScroll={handleWorkspaceScroll} />
      </div>
    </div>
  );
};