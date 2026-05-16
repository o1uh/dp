import React from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { Slider } from '@/shared/ui/Slider';

interface TrackControlsProps {
  trackId: string;
  name: string;
}

export const TrackControls: React.FC<TrackControlsProps> = ({ trackId, name }) => {
  const track = useStudioSessionStore(state => state.tracks.find(t => t.id === trackId));
  const updateParams = useStudioSessionStore(state => state.updateTrackParams);

  if (!track) return null;

  return (
    <div className="flex flex-col gap-2 p-2 bg-slate-800 border border-slate-700 rounded w-48">
      <span className="text-xs font-bold text-gray-300 truncate">{name}</span>
      
      <div className="flex gap-2">
        <button 
          className={`flex-1 text-xs py-1 rounded ${track.is_muted ? 'bg-red-600' : 'bg-slate-700'}`}
          onClick={() => updateParams(trackId, { is_muted: !track.is_muted })}
        >
          M
        </button>
        <button 
          className={`flex-1 text-xs py-1 rounded ${track.is_solo ? 'bg-yellow-600' : 'bg-slate-700'}`}
          onClick={() => updateParams(trackId, { is_solo: !track.is_solo })}
        >
          S
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-400">Gain: {Math.round(track.volume * 100)}%</span>
        <Slider 
          min={0} max={2} step={0.01} 
          value={track.volume} 
          onChange={(v) => updateParams(trackId, { volume: v })} 
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-400">Pan: {Math.round(track.pan * 100)}</span>
        <Slider 
          min={-1} max={1} step={0.01} 
          value={track.pan} 
          onChange={(v) => updateParams(trackId, { pan: v })} 
        />
      </div>
    </div>
  );
};