import { create } from 'zustand';
import { Track } from '@/entities/track/api';

interface AudioQueueState {
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentAudioUrl: string | null;
  
  setPlaylist: (tracks: Track[], startIndex: number) => void;
  play: () => void;
  pause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setCurrentAudioUrl: (url: string | null) => void;
}

export const useAudioQueueStore = create<AudioQueueState>((set, get) => ({
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.5,
  currentAudioUrl: null,

  setPlaylist: (tracks, startIndex) => set({ 
    playlist: tracks, 
    currentIndex: startIndex, 
    isPlaying: true,
    currentAudioUrl: null 
  }),
  play: () => {
    if (get().currentIndex >= 0) set({ isPlaying: true });
  },
  pause: () => set({ isPlaying: false }),
  nextTrack: () => {
    const { playlist, currentIndex } = get();
    if (currentIndex < playlist.length - 1) {
      set({ currentIndex: currentIndex + 1, isPlaying: true, currentAudioUrl: null });
    } else {
      set({ isPlaying: false, currentTime: 0 });
    }
  },
  prevTrack: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1, isPlaying: true, currentAudioUrl: null });
    }
  },
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setCurrentAudioUrl: (currentAudioUrl) => set({ currentAudioUrl }),
}));