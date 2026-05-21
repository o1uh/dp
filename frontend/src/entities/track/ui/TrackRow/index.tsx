import React from 'react';
import { Track } from '../../api';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import Link from 'next/link';

interface TrackRowProps {
  track: Track;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (track: Track) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({ track, onDownload, onDelete, onEdit }) => {
  const setPlaylist = useAudioQueueStore(state => state.setPlaylist);

  return (
    <div className="group bg-background-surface border border-white/[0.04] rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition duration-300">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            {new Date(track.created_at).toLocaleDateString('ru-RU')}
          </span>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${track.visibility === 'public' ? 'bg-accent-green' : 'bg-gray-600'}`} />
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">{track.visibility}</span>
          </div>
        </div>

        <h3 className="text-sm font-bold text-gray-100 truncate group-hover:text-primary transition duration-200">
          {track.title}
        </h3>

        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {track.genre ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-900 border border-white/[0.04] text-gray-300 rounded-full">
              {track.genre}
            </span>
          ) : (
            <span className="text-[10px] italic text-gray-600">Без жанра</span>
          )}
          {track.bpm && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-900 border border-white/[0.04] text-primary rounded-full">
              {track.bpm} BPM
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1.5">
        <button 
          onClick={() => setPlaylist([track], 0)}
          className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-glow-primary active:scale-95"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Слушать
        </button>
        <Link href={`/studio/${track.id}`} className="w-full">
          <button className="w-full px-3 py-1.5 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-lg transition active:scale-95">
            В студию
          </button>
        </Link>
        <button 
          onClick={() => onDownload(track.id)}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/[0.04] text-gray-300 text-xs font-semibold rounded-lg transition"
        >
          Скачать
        </button>
        {onEdit && (
          <button 
            onClick={() => onEdit(track)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/[0.04] text-gray-300 text-xs font-semibold rounded-lg transition"
          >
            Инфо
          </button>
        )}
        <button 
          onClick={() => onDelete(track.id)}
          className="col-span-2 mt-1 px-3 py-1 text-center text-[10px] font-mono font-semibold text-gray-500 hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition"
        >
          УДАЛИТЬ ИЗ БИБЛИОТЕКИ
        </button>
      </div>
    </div>
  );
};