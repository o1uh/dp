import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { Track } from '@/entities/track/api';

describe('Audio Queue Store (Playlist Management)', () => {
  beforeEach(() => {
    useAudioQueueStore.setState({ 
      playlist: [], 
      currentIndex: -1, 
      isPlaying: false,
      currentTime: 0,
      currentAudioUrl: null
    });
  });

  const mockTracks: Track[] = [
    { id: '1', title: 'Track 1', visibility: 'public', play_count: 0, save_count: 0, downloads_count: 0, created_at: '' },
    { id: '2', title: 'Track 2', visibility: 'private', play_count: 0, save_count: 0, downloads_count: 0, created_at: '' }
  ];

  it('Корректно инициализирует плейлист и запускает воспроизведение', () => {
    const store = useAudioQueueStore.getState();
    store.setPlaylist(mockTracks, 0);

    const updatedStore = useAudioQueueStore.getState();
    expect(updatedStore.playlist).toHaveLength(2);
    expect(updatedStore.currentIndex).toBe(0);
    expect(updatedStore.isPlaying).toBe(true);
    expect(updatedStore.currentAudioUrl).toBeNull();
  });

  it('Функция nextTrack инкрементирует индекс, если в массиве есть треки', () => {
    useAudioQueueStore.getState().setPlaylist(mockTracks, 0);
    useAudioQueueStore.getState().nextTrack();

    const updatedStore = useAudioQueueStore.getState();
    expect(updatedStore.currentIndex).toBe(1);
    expect(updatedStore.isPlaying).toBe(true);
  });

  it('Функция nextTrack останавливает воспроизведение в конце списка', () => {
    useAudioQueueStore.getState().setPlaylist(mockTracks, 1);
    useAudioQueueStore.getState().nextTrack();

    const updatedStore = useAudioQueueStore.getState();
    expect(updatedStore.isPlaying).toBe(false);
    expect(updatedStore.currentTime).toBe(0);
  });

  it('Функция prevTrack декрементирует индекс, если текущий индекс > 0', () => {
    useAudioQueueStore.getState().setPlaylist(mockTracks, 1);
    useAudioQueueStore.getState().prevTrack();

    const updatedStore = useAudioQueueStore.getState();
    expect(updatedStore.currentIndex).toBe(0);
    expect(updatedStore.isPlaying).toBe(true);
  });
});