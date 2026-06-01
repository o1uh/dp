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
    <div 
      className="bg-background-deep border border-border hover:border-border-strong p-3 rounded-xl flex flex-col justify-between gap-2 transition-all duration-200 select-none"
      style={{ height: '140px' }}
    >
      {/* Header: Name and Mute/Solo buttons on the same line */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-gray-300 truncate tracking-wide max-w-[80px]" title={name}>
          {name}
        </span>
        <div className="flex gap-1 flex-shrink-0">
          <button 
            className={`text-[9px] px-2 py-1 font-mono font-bold rounded-lg transition-all duration-150 ${
              track.is_muted 
                ? 'bg-accent-red text-white shadow-md shadow-accent-red/20 border border-accent-red/30' 
                : 'bg-background-elevated hover:bg-background-deep text-gray-400 hover:text-gray-100 border border-border'
            } active:scale-95`}
            onClick={() => updateParams(trackId, { is_muted: !track.is_muted })}
          >
            Mute
          </button>
          <button 
            className={`text-[9px] px-2 py-1 font-mono font-bold rounded-lg transition-all duration-150 ${
              track.is_solo 
                ? 'bg-accent-yellow text-slate-950 shadow-md shadow-accent-yellow/20 border border-accent-yellow/30' 
                : 'bg-background-elevated hover:bg-background-deep text-gray-400 hover:text-gray-100 border border-border'
            } active:scale-95`}
            onClick={() => updateParams(trackId, { is_solo: !track.is_solo })}
          >
            Solo
          </button>
        </div>
      </div>

      {/* Volume fader */}
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between text-[8px] font-mono text-gray-500">
          <span>VOL</span>
          <span>{(track.volume * 100).toFixed(0)}%</span>
        </div>
        <Slider 
          min={0} max={2} step={0.01} 
          value={track.volume} 
          onChange={(v) => updateParams(trackId, { volume: v })} 
        />
      </div>

      {/* Pan */}
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between text-[8px] font-mono text-gray-500">
          <span>PAN</span>
          <span>{track.pan === 0 ? 'C' : track.pan > 0 ? `R${(track.pan * 10).toFixed(0)}` : `L${Math.abs(track.pan * 10).toFixed(0)}`}</span>
        </div>
        <Slider 
          min={-1} max={1} step={0.01} 
          value={track.pan} 
          onChange={(v) => updateParams(trackId, { pan: v })} 
        />
      </div>
    </div>
  );
};