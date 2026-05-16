'use client';

import React, { useEffect } from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { TransportPanel } from '@/features/studio/TransportPanel';
import { MixerPanel } from '@/widgets/studio/MixerPanel';
import { AudioWorkspace } from '@/widgets/studio/AudioWorkspace';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';

export const StudioView = ({ sessionId }: { sessionId: string }) => {
  const { initSession, projectName } = useStudioSessionStore();
  const pauseGlobalPlayer = useAudioQueueStore(state => state.pause);

  useEffect(() => {
    pauseGlobalPlayer();
    initSession(sessionId, 'Draft Project');
    // здесь будет API-запрос loadSession(sessionId)
  }, [sessionId, initSession, pauseGlobalPlayer]);

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