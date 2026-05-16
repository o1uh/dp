import React from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { TrackControls } from '@/features/studio/TrackControls';

export const MixerPanel = () => {
  const tracks = useStudioSessionStore(state => state.tracks);

  return (
    <div className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col gap-2 p-2 overflow-y-auto">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Микшер</div>
      {tracks.map((track, index) => (
        <TrackControls key={track.id} trackId={track.id} name={`Track ${index + 1}`} />
      ))}
    </div>
  );
};