import { create } from 'zustand';

interface TrackState {
  searchQuery: string;
  genreFilter: string;
  setSearchQuery: (query: string) => void;
  setGenreFilter: (genre: string) => void;
  resetFilters: () => void;
}

export const useTrackStore = create<TrackState>((set) => ({
  searchQuery: '',
  genreFilter: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setGenreFilter: (genreFilter) => set({ genreFilter }),
  resetFilters: () => set({ searchQuery: '', genreFilter: '' }),
}));