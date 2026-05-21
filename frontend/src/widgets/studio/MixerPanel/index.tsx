import React from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { TrackControls } from '@/features/studio/TrackControls';

export const MixerPanel = () => {
  const tracks = useStudioSessionStore(state => state.tracks);

  return (
    <div className="w-56 bg-background-surface border-r border-slate-900 flex flex-col h-full overflow-hidden select-none">
      <div className="h-10 border-b border-slate-900 flex items-center px-4 bg-slate-950/40 shrink-0">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">АУДИО-МИКШЕР</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {tracks.map((track, index) => (
          <TrackControls key={track.id} trackId={track.id} name={track.name || `CH 0${index + 1}`} />
        ))}
      </div>
    </div>
  );
};