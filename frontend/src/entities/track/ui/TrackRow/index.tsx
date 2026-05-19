import React from 'react';
import { Track } from '../../api';
import { Button } from '@/shared/ui/Button';
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
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col justify-between hover:border-primary transition">
      <div>
        <h3 className="text-primary font-bold truncate">{track.title}</h3>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(track.created_at).toLocaleDateString('ru-RU')}
        </p>
        <div className="mt-2 flex gap-1 flex-wrap">
          <span className="text-xs px-2 py-1 bg-slate-900 rounded">{track.visibility}</span>
          {track.genre && <span className="text-xs px-2 py-1 bg-slate-900 rounded">{track.genre}</span>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="primary" className="w-full text-xs py-1" onClick={() => setPlaylist([track], 0)}>
          ▶ Play
        </Button>
        <Link href={`/studio/${track.id}`} className="w-full">
          <Button variant="secondary" className="w-full text-xs py-1">
            В студию
          </Button>
        </Link>
        <Button variant="secondary" className="w-full text-xs py-1" onClick={() => onDownload(track.id)}>
          Скачать
        </Button>
        {onEdit && (
          <Button variant="primary" className="w-full text-xs py-1" onClick={() => onEdit(track)}>
            Метаданные
          </Button>
        )}
        <Button variant="danger" className="w-full text-xs py-1 col-span-2" onClick={() => onDelete(track.id)}>
          Удалить
        </Button>
      </div>
    </div>
  );
};