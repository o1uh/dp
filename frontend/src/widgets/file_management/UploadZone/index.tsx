'use client';

import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/api/query-keys';
import { useUserStore } from '@/entities/user/model/store';
import { useFileStore } from '@/entities/file/model/store';
import { fileApi } from '@/entities/file/api';
import { apiClient } from '@/shared/api/rest';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/shared/config/constants';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

export const UploadZone = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, progress, error, setStatus, setProgress, setError, reset } = useFileStore();
  const queryClient = useQueryClient();
  const userId = useUserStore(state => state.profile?.id);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [selectedModel, setSelectedModel] = useState<'htdemucs' | 'cascade_guitar'>('cascade_guitar');

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

  const initFileSelection = (file: File) => {
    reset();
    setSelectedModel('cascade_guitar'); 
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Неподдерживаемый формат аудио.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Файл превышает лимит 500 МБ.');
      return;
    }
    setPendingFile(file);
    const cleanedName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setTrackTitle(cleanedName);
  };

  const handleStartProcessing = async () => {
    if (!pendingFile) return;
    const file = pendingFile;
    
    const modelToUse = selectedModel; 
    console.log("[UploadZone] Запуск обработки. Выбранная модель:", modelToUse);
    
    setPendingFile(null);
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
            original_filename: `${trackTitle}${file.name.substring(file.name.lastIndexOf('.'))}`,
            separation_mode: modelToUse
          });

          if (initRes.is_duplicate) {
            if (initRes.stems && initRes.stems.length > 0) {
              setStatus('ready');
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
              setTimeout(() => reset(), 2000);
              return;
            } else {
              setStatus('processing');
              console.log("[UploadZone] Дубликат без стемов. Отправка задачи /tasks с моделью:", modelToUse);
              await apiClient.post('/tasks', {
                file_id: initRes.file_id,
                config: { model: modelToUse } 
              });
              return;
            }
          }

          if (initRes.upload_url && initRes.file_id) {
            await fileApi.uploadToS3(initRes.upload_url, file, setProgress);
            await fileApi.confirmUpload(initRes.file_id);
            setStatus('processing');
            
            console.log("[UploadZone] Файл загружен. Отправка задачи /tasks с моделью:", modelToUse);
            await apiClient.post('/tasks', {
              file_id: initRes.file_id,
              config: { model: modelToUse }
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

  return (
    <>
      <div 
        className="group relative w-full h-56 border border-dashed border-slate-800 rounded-xl bg-background-surface/30 hover:bg-background-surface/50 hover:border-primary/50 transition duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer"
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) initFileSelection(f); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={(e) => {
            if (e.target.files?.[0]) {
              initFileSelection(e.target.files[0]);
              e.target.value = '';
            }
          }} 
          accept={ALLOWED_MIME_TYPES.join(',')} 
        />

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
            <p className="text-xs font-mono text-primary uppercase tracking-wider">Генерация контрольной суммы (SHA-256)...</p>
          </div>
        )}

        {status === 'uploading' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-3">
            <div className="flex justify-between w-full text-xs font-mono text-gray-400">
              <span>ПЕРЕДАЧА ДАННЫХ В S3 ХРАНИЛИЩЕ</span>
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
              <p className="text-xs font-mono text-secondary uppercase tracking-wider">AI разделяет трек на изолированные слои...</p>
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
            <p className="text-sm font-semibold text-accent-green">Готово к обработке</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-accent-red">{error}</p>
            <span className="text-xs text-gray-400 underline mt-2">Нажмите для повторной попытки</span>
          </div>
        )}
      </div>

      {/* Модальное окно настройки декомпозиции */}
      {pendingFile && (
        <Modal onClose={() => setPendingFile(null)}>
          <div className="bg-background-surface border border-white/[0.06] p-6 rounded-xl flex flex-col gap-5 w-full">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">Параметры декомпозиции</h3>
            
            <Input 
              label="Отображаемое название трека" 
              value={trackTitle} 
              onChange={(e) => setTrackTitle(e.target.value)} 
              required 
            />

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">
                ВЫБОР НЕЙРОСЕТЕВОЙ МОДЕЛИ
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedModel('htdemucs')}
                  className={`p-3 text-left rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                    selectedModel === 'htdemucs' 
                      ? 'bg-primary/5 border-primary text-white' 
                      : 'bg-[#05070B] border-white/[0.04] text-gray-400 hover:border-white/[0.1]'
                  }`}
                >
                  <span className="font-bold">Стандартная модель (4 стема)</span>
                  <span className="text-[10px] text-gray-500">Вокал, Барабаны, Бас, Другое (включая гитары). Быстрый инференс.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModel('cascade_guitar')}
                  className={`p-3 text-left rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                    selectedModel === 'cascade_guitar' 
                      ? 'bg-secondary/5 border-secondary text-white shadow-glow' 
                      : 'bg-[#05070B] border-white/[0.04] text-gray-400 hover:border-white/[0.1]'
                  }`}
                >
                  <span className="font-bold text-secondary">Премиум каскад (5 стемов) ⭐</span>
                  <span className="text-[10px] text-gray-500">Вокал, Барабаны, Бас, Гитара и чистый стем «Другое» без утечек гитары.</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="secondary" onClick={() => setPendingFile(null)}>Отмена</Button>
              <Button variant="primary" onClick={handleStartProcessing}>Запустить AI</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};