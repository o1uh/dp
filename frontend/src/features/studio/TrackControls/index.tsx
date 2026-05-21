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
    <div className="bg-slate-950/60 border border-white/[0.02] p-3 rounded-lg flex flex-col justify-between h-[150px]">
      {/* Имя канала и номер */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-300 truncate tracking-wide">{name}</span>
        <span className="text-[9px] font-mono text-gray-600">DB_FADER</span>
      </div>
      
      {/* Кнопки Mute / Solo */}
      <div className="flex gap-1">
        <button 
          className={`flex-1 text-[10px] py-1 font-mono font-bold rounded transition-all duration-150 ${track.is_muted ? 'bg-accent-red text-white shadow-md shadow-accent-red/20' : 'bg-slate-900 text-gray-500 hover:text-gray-300 border border-white/[0.04]'}`}
          onClick={() => updateParams(trackId, { is_muted: !track.is_muted })}
        >
          MUTE
        </button>
        <button 
          className={`flex-1 text-[10px] py-1 font-mono font-bold rounded transition-all duration-150 ${track.is_solo ? 'bg-accent-yellow text-slate-950 shadow-md shadow-accent-yellow/20' : 'bg-slate-900 text-gray-500 hover:text-gray-300 border border-white/[0.04]'}`}
          onClick={() => updateParams(trackId, { is_solo: !track.is_solo })}
        >
          SOLO
        </button>
      </div>

      {/* Фейдер громкости */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[9px] font-mono text-gray-500">
          <span>GAIN</span>
          <span>{(track.volume * 100).toFixed(0)}%</span>
        </div>
        <Slider 
          min={0} max={2} step={0.01} 
          value={track.volume} 
          onChange={(v) => updateParams(trackId, { volume: v })} 
        />
      </div>

      {/* Панорамирование */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[9px] font-mono text-gray-500">
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