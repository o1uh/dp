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
      console.log(`[GLOBAL PLAYER UI] Resolving download S3 URL for track: ${currentTrack.id}`);
      try {
        const url = await trackApi.getDownloadUrl(currentTrack.id);
        console.log(`[GLOBAL PLAYER UI] Download URL successfully resolved: ${url}`);
        if (isMounted) setCurrentAudioUrl(url);
      } catch (e) {
        console.error(`[GLOBAL PLAYER UI ERROR] Failed to resolve download S3 URL for track ${currentTrack.id}:`, e);
        if (isMounted) {
          console.warn("[GLOBAL PLAYER UI] Falling back to next track in playlist queue due to resolution error.");
          nextTrack();
        }
      }
    };

    if (currentTrack && !currentAudioUrl) {
      fetchUrl();
    }

    return () => { isMounted = false; };
  }, [currentTrack, currentAudioUrl, setCurrentAudioUrl, nextTrack]);

  useEffect(() => {
    if (audioRef.current) {
      console.log(`[GLOBAL PLAYER UI] Applying volume update: ${volume}`);
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (!currentAudioUrl) {
      console.warn("[GLOBAL PLAYER UI] Playback request blocked: Current audio source URL is empty");
      return;
    }

    if (isPlaying) {
      console.log(`[GLOBAL PLAYER UI] Invoking native play() for stream: ${currentAudioUrl}`);
      audioRef.current.play().catch(e => {
        console.error("[GLOBAL PLAYER UI ERROR] Native browser playback engine prevented auto-start:", e);
      });
    } else {
      console.log("[GLOBAL PLAYER UI] Invoking native pause().");
      audioRef.current.pause();
    }
  }, [isPlaying, currentAudioUrl]);

  if (!currentTrack) return null;

  return (
    <audio
      ref={audioRef}
      src={currentAudioUrl || undefined}
      onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
      onLoadedMetadata={() => {
        const duration = audioRef.current?.duration || 0;
        console.log(`[GLOBAL PLAYER UI] Native metadata load finalized. Duration registered: ${duration}s`);
        setDuration(duration);
      }}
      onError={(e) => {
        const nativeError = audioRef.current?.error;
        console.error(`[GLOBAL PLAYER UI ERROR] Native HTMLAudioElement raised playback exception. Code: ${nativeError?.code}, Message: ${nativeError?.message}`, e);
        console.warn("[GLOBAL PLAYER UI] Executing emergency jump to next track...");
        nextTrack();
      }}
      onEnded={() => {
        console.log("[GLOBAL PLAYER UI] Track play finished. Transitioning to next playlist index...");
        nextTrack();
      }}
    />
  );
};