import React from 'react';
import { useStudioSessionStore } from '@/entities/studio_session/model/store';
import { TrackControls } from '@/features/studio/TrackControls';

interface MixerPanelProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const MixerPanel: React.FC<MixerPanelProps> = ({ scrollRef, onScroll }) => {
  const tracks = useStudioSessionStore(state => state.tracks);

  return (
    <div className="w-56 bg-background-surface border-r border-border flex flex-col h-full overflow-hidden select-none flex-shrink-0">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center px-4 bg-background-deep shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">МИКШЕР</span>
        </div>
      </div>

      {/* Tracks container (vertical scroll synchronized, scrollbar hidden) */}
      <div 
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-scroll py-4 px-3 flex flex-col gap-4 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tracks.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px] font-mono text-gray-500">НЕТ ДОРОЖЕК</span>
          </div>
        ) : (
          tracks.map((track, index) => (
            <TrackControls key={track.id} trackId={track.id} name={track.name || `CH ${String(index + 1).padStart(2, '0')}`} />
          ))
        )}
      </div>
    </div>
  );  
};