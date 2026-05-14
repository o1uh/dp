import { create } from 'zustand';

interface StemState {
  classFilter: string;
  setClassFilter: (stemClass: string) => void;
}

export const useStemStore = create<StemState>((set) => ({
  classFilter: 'all',
  setClassFilter: (classFilter) => set({ classFilter }),
}));