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
  seekVersion: number;
  autoScrollEnabled: boolean;
  
  initSession: (id: string, name: string) => void;
  setTracks: (tracks: StudioTrack[]) => void;
  updateTrackParams: (trackId: string, params: Partial<StudioTrack>) => void;
  setTrackBuffer: (trackId: string, buffer: AudioBuffer) => void;
  toggleLoop: () => void;
  play: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  seekTo: (time: number) => void;
  toggleAutoScroll: () => void;
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
  seekVersion: 0,
  autoScrollEnabled: true,

  initSession: (id, name) => {
    console.log(`[STUDIO STORE] Initializing session. ID: ${id}, Name: '${name}'`);
    set({ sessionId: id, projectName: name, tracks: [], currentTime: 0, isPlaying: false, seekVersion: 0, autoScrollEnabled: true });
  },
  
  setTracks: (tracks) => {
    console.log(`[STUDIO STORE] Loading raw tracks into workspace grid. Count: ${tracks.length}`);
    set({ tracks });
  },
  
  toggleLoop: () => set((state) => {
    console.log(`[STUDIO STORE] Loop state toggled. New state: ${!state.isLoop}`);
    return { isLoop: !state.isLoop };
  }),

  updateTrackParams: (trackId, params) => set((state) => {
    console.log(`[STUDIO STORE] Updating track metrics. Track ID: ${trackId}, Params payload:`, params);
    const updatedTracks = state.tracks.map(t => {
      if (t.id === trackId) {
        const updatedTrack = { ...t, ...params };
        if (updatedTrack.nodes) {
          const actualVolume = updatedTrack.is_muted ? 0 : updatedTrack.volume;
          console.log(`[STUDIO STORE] Applying Web Audio properties on Nodes for Track: ${trackId}. Volume applied: ${actualVolume}, Pan applied: ${updatedTrack.pan}`);
          updatedTrack.nodes.gain.gain.value = actualVolume;
          updatedTrack.nodes.panner.pan.value = updatedTrack.pan;
        }
        return updatedTrack;
      }
      return t;
    });

    const anySolo = updatedTracks.some(t => t.is_solo);
    console.log(`[STUDIO STORE] Routing volume matrix. Solo tracks present on workspace: ${anySolo}`);
    updatedTracks.forEach(t => {
      if (t.nodes) {
        const isMutedBySolo = anySolo && !t.is_solo;
        const actualVolume = (t.is_muted || isMutedBySolo) ? 0 : t.volume;
        console.log(`[STUDIO STORE] Calculated channel volume for Track index ${t.track_index}: ${actualVolume} (Muted: ${t.is_muted}, Solo override: ${isMutedBySolo})`);
        t.nodes.gain.gain.value = actualVolume;
      }
    });

    return { tracks: updatedTracks };
  }),

  setTrackBuffer: (trackId, buffer) => set((state) => {
    console.log(`[STUDIO STORE] Attaching decoded PCM audio buffer to Track: ${trackId}. Duration: ${buffer.duration}s, Sample Rate: ${buffer.sampleRate}Hz`);
    const ctx = getAudioContext();
    const updatedTracks = state.tracks.map(t => {
      if (t.id === trackId) {
        console.log(`[STUDIO STORE] Allocating GainNode and StereoPannerNode assets in Web Audio Graph for Track: ${trackId}`);
        const gainNode = createGainNode(ctx, t.is_muted ? 0 : t.volume);
        const pannerNode = createPannerNode(ctx, t.pan);
        
        console.log(`[STUDIO STORE] Connecting StereoPannerNode -> GainNode -> Destination context destination`);
        connectNodes(pannerNode, gainNode, ctx.destination);
        
        return { ...t, buffer, nodes: { source: null, gain: gainNode, panner: pannerNode } };
      }
      return t;
    });
    
    const maxDuration = Math.max(...updatedTracks.map(t => (t.buffer?.duration || 0) + (t.start_offset_ms / 1000)));
    console.log(`[STUDIO STORE] Track buffer successfully registered. Re-calculating total workspace limits: ${maxDuration}s`);
    return { tracks: updatedTracks, duration: maxDuration };
  }),

  play: () => {
    const { tracks, currentTime, isLoop, duration } = get();
    const ctx = getAudioContext();
    console.log(`[STUDIO STORE] Triggering transport PLAY. Requested Start Offset: ${currentTime}s, Global Duration: ${duration}s, Loop: ${isLoop}. Context state: ${ctx.state}`);
    
    if (ctx.state === 'suspended') {
      console.log('[STUDIO STORE] Web Audio Context is suspended. Forcing manual resume...');
      ctx.resume();
    }

    const sourcesToSync: { node: AudioBufferSourceNode, trimStartMs: number, trimEndMs: number | null }[] = [];
    const newTracks = tracks.map(t => {
      if (t.buffer && t.nodes) {
        if (t.nodes.source) {
          try { 
            console.log(`[STUDIO STORE] Stopping existing AudioBufferSourceNode for Track: ${t.id} to reset scheduling`);
            t.nodes.source.stop(); 
            t.nodes.source.disconnect(); 
          } catch (e) {}
        }
        
        console.log(`[STUDIO STORE] Instantiating AudioBufferSourceNode for Track: ${t.id}`);
        const source = ctx.createBufferSource();
        source.buffer = t.buffer;
        
        console.log(`[STUDIO STORE] Linking AudioBufferSourceNode -> StereoPannerNode for Track: ${t.id}`);
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

    console.log(`[STUDIO STORE] Dispatching syncPlayback scheduling call for ${sourcesToSync.length} active channels`);
    syncPlayback({ sourceNodes: sourcesToSync, startOffset: currentTime, isLoop, duration });
    set({ isPlaying: true, tracks: newTracks });
  },
  
  stop: () => {
    const { tracks } = get();
    console.log('[STUDIO STORE] Triggering transport STOP/PAUSE. Disconnecting active oscillators...');
    const sources = tracks.map(t => t.nodes?.source).filter(Boolean) as AudioBufferSourceNode[];
    
    console.log(`[STUDIO STORE] Disconnecting and stopping ${sources.length} active source nodes...`);
    stopPlayback(sources);
    
    const clearedTracks = tracks.map(t => t.nodes ? { ...t, nodes: { ...t.nodes, source: null } } : t);
    set({ isPlaying: false, tracks: clearedTracks });
    console.log('[STUDIO STORE] Stop sequence completed. Transport state set to idle.');
  },
  
  setCurrentTime: (time) => set({ currentTime: time }),

  seekTo: (time) => {
    const { isPlaying, play, stop, setCurrentTime, duration } = get();
    const targetTime = Math.max(0, Math.min(time, duration));
    console.log(`[STUDIO STORE] Scrub/Seek event captured. Target Time: ${targetTime}s, IsPlaying: ${isPlaying}`);
    
    if (isPlaying) {
      console.log('[STUDIO STORE] Active playback scrub. Restarting scheduler at new coordinates...');
      stop();
      setCurrentTime(targetTime);
      set((state) => ({ seekVersion: state.seekVersion + 1 }));
      play();
    } else {
      console.log('[STUDIO STORE] Static transport scrub. Setting marker coordinates...');
      setCurrentTime(targetTime);
      set((state) => ({ seekVersion: state.seekVersion + 1 }));
    }
  },

  toggleAutoScroll: () => set((state) => {
    console.log(`[STUDIO STORE] AutoScroll settings updated. New state: ${!state.autoScrollEnabled}`);
    return { autoScrollEnabled: !state.autoScrollEnabled };
  })
}));