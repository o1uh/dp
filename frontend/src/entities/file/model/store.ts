import { create } from 'zustand';

interface FileState {
  progress: number;
  status: 'idle' | 'hashing' | 'uploading' | 'processing' | 'ready' | 'error';
  error: string | null;
  setProgress: (progress: number) => void;
  setStatus: (status: FileState['status']) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  progress: 0,
  status: 'idle',
  error: null,
  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: 'error' }),
  reset: () => set({ progress: 0, status: 'idle', error: null }),
}));