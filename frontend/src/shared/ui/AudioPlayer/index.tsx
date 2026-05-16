'use client';

import React, { useEffect, useRef } from 'react';
import { useAudioQueueStore } from '@/entities/audio_queue/model/store';
import { trackApi } from '@/entities/track/api';

export const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { 
    playlist, 
    currentIndex, 
    isPlaying, 
    volume, 
    currentAudioUrl,
    nextTrack, 
    setCurrentTime, 
    setDuration,
    setCurrentAudioUrl
  } = useAudioQueueStore();

  const currentTrack = playlist[currentIndex];

  useEffect(() => {
    let isMounted = true;
    
    const fetchUrl = async () => {
      if (!currentTrack) return;
      try {
        const url = await trackApi.getDownloadUrl(currentTrack.id);
        if (isMounted) setCurrentAudioUrl(url);
      } catch (e) {
        console.error('Failed to fetch audio URL', e);
        if (isMounted) nextTrack();
      }
    };

    if (currentTrack && !currentAudioUrl) {
      fetchUrl();
    }

    return () => { isMounted = false; };
  }, [currentTrack, currentAudioUrl, setCurrentAudioUrl, nextTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current || !currentAudioUrl) return;

    if (isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback prevented", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentAudioUrl]);

  if (!currentTrack) return null;

  return (
    <audio
      ref={audioRef}
      src={currentAudioUrl || undefined}
      onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
      onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      onEnded={nextTrack}
    />
  );
};