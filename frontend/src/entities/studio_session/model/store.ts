import { create } from 'zustand';
import { getAudioContext } from '@/shared/lib/web-audio/context';
import { createGainNode, createPannerNode, connectNodes } from '@/shared/lib/web-audio/nodes';
import { syncPlayback, stopPlayback } from '@/shared/lib/web-audio/sync';

export interface AudioGraphNodes {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  panner: StereoPannerNode;
}

export interface StudioTrack {
  id: string;
  name?: string;
  stem_id: string | null;
  file_id: string | null;
  track_index: number;
  volume: number;
  pan: number;
  is_muted: boolean;
  is_solo: boolean;
  start_offset_ms: number;
  trim_start_ms: number;
  trim_end_ms: number | null;
  buffer: AudioBuffer | null;
  nodes: AudioGraphNodes | null;
}

interface StudioSessionState {
  sessionId: string | null;
  projectName: string;
  bpm: number;
  tracks: StudioTrack[];
  isPlaying: boolean;
  isLoop: boolean;
  currentTime: number;
  duration: number;
  
  initSession: (id: string, name: string) => void;
  setTracks: (tracks: StudioTrack[]) => void;
  updateTrackParams: (trackId: string, params: Partial<StudioTrack>) => void;
  setTrackBuffer: (trackId: string, buffer: AudioBuffer) => void;
  toggleLoop: () => void;
  play: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
}

export const useStudioSessionStore = create<StudioSessionState>((set, get) => ({
  sessionId: null,
  projectName: '',
  bpm: 120,
  tracks: [],
  isPlaying: false,
  isLoop: false,
  currentTime: 0,
  duration: 0,

  initSession: (id, name) => set({ sessionId: id, projectName: name, tracks: [], currentTime: 0, isPlaying: false }),
  setTracks: (tracks) => set({ tracks }),
  
  toggleLoop: () => set((state) => ({ isLoop: !state.isLoop })),

  updateTrackParams: (trackId, params) => set((state) => {
    const updatedTracks = state.tracks.map(t => {
      if (t.id === trackId) {
        const updatedTrack = { ...t, ...params };
        if (updatedTrack.nodes) {
          const actualVolume = updatedTrack.is_muted ? 0 : updatedTrack.volume;
          updatedTrack.nodes.gain.gain.value = actualVolume;
          updatedTrack.nodes.panner.pan.value = updatedTrack.pan;
        }
        return updatedTrack;
      }
      return t;
    });

    const anySolo = updatedTracks.some(t => t.is_solo);
    updatedTracks.forEach(t => {
      if (t.nodes) {
        const isMutedBySolo = anySolo && !t.is_solo;
        const actualVolume = (t.is_muted || isMutedBySolo) ? 0 : t.volume;
        t.nodes.gain.gain.value = actualVolume;
      }
    });

    return { tracks: updatedTracks };
  }),

  setTrackBuffer: (trackId, buffer) => set((state) => {
    const ctx = getAudioContext();
    const updatedTracks = state.tracks.map(t => {
      if (t.id === trackId) {
        const gainNode = createGainNode(ctx, t.is_muted ? 0 : t.volume);
        const pannerNode = createPannerNode(ctx, t.pan);
        connectNodes(pannerNode, gainNode, ctx.destination);
        return { ...t, buffer, nodes: { source: null, gain: gainNode, panner: pannerNode } };
      }
      return t;
    });
    
    const maxDuration = Math.max(...updatedTracks.map(t => (t.buffer?.duration || 0) + (t.start_offset_ms / 1000)));
    return { tracks: updatedTracks, duration: maxDuration };
  }),

  play: () => {
    const { tracks, currentTime, isLoop, duration } = get();
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const sourcesToSync: { node: AudioBufferSourceNode, trimStartMs: number, trimEndMs: number | null }[] = [];
    const newTracks = tracks.map(t => {
      if (t.buffer && t.nodes) {
        if (t.nodes.source) {
          try { t.nodes.source.stop(); t.nodes.source.disconnect(); } catch (e) {}
        }
        const source = ctx.createBufferSource();
        source.buffer = t.buffer;
        source.connect(t.nodes.panner);
        
        sourcesToSync.push({ 
          node: source, 
          trimStartMs: t.trim_start_ms, 
          trimEndMs: t.trim_end_ms 
        });
        
        return { ...t, nodes: { ...t.nodes, source } };
      }
      return t;
    });

    syncPlayback({ sourceNodes: sourcesToSync, startOffset: currentTime, isLoop, duration });
    set({ isPlaying: true, tracks: newTracks });
  },
  
  stop: () => {
    const { tracks } = get();
    const sources = tracks.map(t => t.nodes?.source).filter(Boolean) as AudioBufferSourceNode[];
    stopPlayback(sources);
    
    const clearedTracks = tracks.map(t => t.nodes ? { ...t, nodes: { ...t.nodes, source: null } } : t);
    set({ isPlaying: false, tracks: clearedTracks });
  },
  
  setCurrentTime: (time) => set({ currentTime: time })
}));