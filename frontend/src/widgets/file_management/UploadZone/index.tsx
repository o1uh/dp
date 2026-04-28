'use client';

import React, { useCallback, useRef } from 'react';
import { useFileStore } from '@/entities/file/model/store';
import { fileApi } from '@/entities/file/api';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/shared/config/constants';

export const UploadZone = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, progress, error, setStatus, setProgress, setError, reset } = useFileStore();

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
      setError('Неподдерживаемый формат файла');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Файл слишком большой');
      return;
    }

    setStatus('hashing');
    
    try {
      const duration = await getAudioDuration(file);

      const worker = new Worker(new URL('@/shared/lib/workers/hash.worker.ts', import.meta.url));
      worker.postMessage(file);
      
      worker.onmessage = async (e) => {
        if (e.data.error) {
          setError('Ошибка вычисления хеша');
          return;
        }
        
        const hash = e.data.hash;
        worker.terminate();

        setStatus('uploading');
        const initRes = await fileApi.initUpload({
          file_hash: hash,
          mime_type: file.type,
          file_size_bytes: file.size,
          duration_sec: duration
        });

        if (initRes.is_duplicate) {
          setStatus('ready');
          return;
        }

        if (initRes.upload_url && initRes.file_id) {
          await fileApi.uploadToS3(initRes.upload_url, file, setProgress);
          await fileApi.confirmUpload(initRes.file_id);
          setStatus('ready');
        }
      };
    } catch (err) {
      setError('Ошибка обработки файла');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div 
      className="w-full h-64 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center p-6 bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer"
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
      
      {status === 'idle' && <p className="text-gray-400">Перетащите файл сюда или кликните для выбора</p>}
      {status === 'hashing' && <p className="text-primary animate-pulse">Вычисление хеша...</p>}
      {status === 'uploading' && (
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm mb-1">
            <span>Загрузка...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
      {status === 'ready' && <p className="text-green-500">Файл успешно загружен!</p>}
      {status === 'error' && <p className="text-red-500">{error}</p>}
    </div>
  );
};