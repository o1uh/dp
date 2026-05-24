'use client';

import React, { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/api/query-keys';
import { useUserStore } from '@/entities/user/model/store';
import { useFileStore } from '@/entities/file/model/store';
import { fileApi } from '@/entities/file/api';
import { apiClient } from '@/shared/api/rest';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/shared/config/constants';

export const UploadZone = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, progress, error, setStatus, setProgress, setError, reset } = useFileStore();
  const queryClient = useQueryClient();
  const userId = useUserStore(state => state.profile?.id);

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };
      audio.onerror = () => resolve(0);
    });
  };

  const handleFile = async (file: File) => {
    reset();
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Неподдерживаемый аудиоформат. Используйте mp3, wav, flac.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Объем файла превышает лимит (500 MB)');
      return;
    }

    setStatus('hashing');
    
    try {
      const duration = await getAudioDuration(file);

      const worker = new Worker(new URL('@/shared/lib/workers/hash.worker.ts', import.meta.url));
      worker.postMessage(file);
      
      worker.onmessage = async (e) => {
        if (e.data.error) {
          setError('Ошибка валидации целостности данных');
          return;
        }
        
        const hash = e.data.hash;
        worker.terminate();

        setStatus('uploading');
        
        try {
          const initRes = await fileApi.initUpload({
            file_hash: hash,
            mime_type: file.type,
            file_size_bytes: file.size,
            duration_sec: duration,
            original_filename: file.name
          });

          if (initRes.is_duplicate) {
            setStatus('ready');
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
            setTimeout(() => reset(), 2000);
            return;
          }

          if (initRes.upload_url && initRes.file_id) {
            await fileApi.uploadToS3(initRes.upload_url, file, setProgress);
            await fileApi.confirmUpload(initRes.file_id);
            setStatus('processing');
            
            await apiClient.post('/tasks', {
              file_id: initRes.file_id,
              model_config: { model: "HT_Demucs_v4" }
            });
          }
        } catch (err: any) {
          setError(err.response?.data?.message || err.message || 'Ошибка передачи данных на S3');
        }
      };
    } catch (err) {
      setError('Ошибка локального декодирования файла');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div 
      className="group relative w-full h-56 border border-dashed border-slate-800 rounded-xl bg-background-surface/30 hover:bg-background-surface/50 hover:border-primary/50 transition duration-300 flex flex-col items-center justify-center p-6 text-center overflow-hidden"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
        accept={ALLOWED_MIME_TYPES.join(',')} 
      />

      {/* Анимированный фоновый градиент при загрузке */}
      {status === 'uploading' && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-secondary to-pink-500 animate-pulse" />
      )}

      {status === 'idle' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:scale-110 transition duration-300">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-200">Перетащите аудиофайл для декомпозиции</p>
            <p className="text-xs text-gray-500 mt-1">MP3, WAV, FLAC до 500 MB</p>
          </div>
        </div>
      )}

      {status === 'hashing' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs font-mono text-primary uppercase tracking-wider">Вычисление контрольной суммы (SHA-256)...</p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <div className="flex justify-between w-full text-xs font-mono text-gray-400">
            <span>ЗАГРУЗКА В S3 ХРАНИЛИЩЕ</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/[0.04]">
            <div className="bg-primary h-full rounded-full transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <div>
            <p className="text-xs font-mono text-secondary uppercase tracking-wider">Demucs v4 извлекает компоненты трека...</p>
            <p className="text-[10px] text-gray-500 mt-1">Обычно это занимает от 15 до 45 секунд.</p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center border border-accent-green/30">
            <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-accent-green">Файл успешно загружен и готов к работе</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-accent-red/20 flex items-center justify-center border border-accent-red/30">
            <svg className="w-5 h-5 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-accent-red">{error}</p>
          <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-xs text-gray-400 hover:text-white underline mt-2">Попробовать снова</button>
        </div>
      )}
    </div>
  );
};