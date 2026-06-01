'use client';

import React, { useState, useRef, useCallback } from 'react';
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
  const [isDragOver, setIsDragOver] = useState(false);

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

  const initFileSelection = useCallback((file: File) => {
    reset();
    setSelectedModel('cascade_guitar');
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Неподдерживаемый формат аудио. Поддерживаются MP3, WAV, FLAC.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Файл превышает лимит 500 МБ.');
      return;
    }
    setPendingFile(file);
    const cleanedName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setTrackTitle(cleanedName);
  }, [reset, setSelectedModel, setError]);

  const handleStartProcessing = async () => {
    if (!pendingFile) return;
    const file = pendingFile;
    const modelToUse = selectedModel;
    
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
        className={`group relative w-full h-56 border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer overflow-hidden ${
          isDragOver
            ? 'border-primary/60 bg-primary/5 scale-[1.01]'
            : status === 'idle'
              ? 'border-slate-700/60 hover:border-primary/40 bg-background-surface/20 hover:bg-background-surface/30'
              : 'border-slate-700/40 bg-background-surface/20'
        }`}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) initFileSelection(f); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => status === 'idle' && fileInputRef.current?.click()}
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

        {/* Animated gradient bar on upload */}
        {status === 'uploading' && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-secondary to-pink-500 animate-shimmer" />
        )}

        {/* Glow on drag */}
        {isDragOver && (
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        )}

        {/* IDLE STATE */}
        {status === 'idle' && !isDragOver && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border border-white/[0.06] group-hover:scale-110 group-hover:border-primary/30 transition-all duration-300">
              <svg className="w-6 h-6 text-gray-400 group-hover:text-primary transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200 mb-1">Перетащите аудиофайл для декомпозиции</p>
              <p className="text-xs text-gray-600">MP3, WAV, FLAC до 500 МБ</p>
            </div>
          </div>
        )}

        {/* DRAG OVER STATE */}
        {isDragOver && (
          <div className="flex flex-col items-center gap-3 animate-fade-in-scale">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/40">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-bold text-primary">Отпустите файл для загрузки</p>
          </div>
        )}

        {/* HASHING STATE */}
        {status === 'hashing' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <p className="text-xs font-mono text-primary font-semibold uppercase tracking-widest">Генерация контрольной суммы (SHA-256)...</p>
          </div>
        )}

        {/* UPLOADING STATE */}
        {status === 'uploading' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 6m0 0l-4.5 4.5M12 6v13.5" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs font-mono text-gray-400 mb-1.5">
                  <span className="font-semibold tracking-wide">ПЕРЕДАЧА В S3</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-150" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROCESSING STATE */}
        {status === 'processing' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <div className="text-center">
              <p className="text-xs font-mono text-secondary font-bold uppercase tracking-widest mb-1">
                Нейросеть разделяет трек на слои
              </p>
              <p className="text-[10px] text-gray-600">Это может занять до 2 минут</p>
            </div>
          </div>
        )}

        {/* READY STATE */}
        {status === 'ready' && (
          <div className="flex flex-col items-center gap-3 animate-fade-in-scale">
            <div className="w-12 h-12 rounded-full bg-accent-green/15 flex items-center justify-center border-2 border-accent-green/30">
              <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-accent-green">Готово к обработке</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Трек отправлен в очередь AI-воркера</p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-red/15 flex items-center justify-center border border-accent-red/20">
              <svg className="w-5 h-5 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-accent-red text-center max-w-md">{error}</p>
            <button 
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-4 transition"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>

      {/* Modal for decomposition settings */}
      {pendingFile && (
        <Modal onClose={() => setPendingFile(null)} title="Параметры декомпозиции" size="md">
          <div className="flex flex-col gap-5">
            <Input 
              label="Отображаемое название трека" 
              value={trackTitle} 
              onChange={(e) => setTrackTitle(e.target.value)} 
              required 
              placeholder="Название трека"
              leftIcon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              }
            />

            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">
                НЕЙРОСЕТЕВАЯ МОДЕЛЬ
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedModel('htdemucs')}
                  className={`
                    p-3.5 text-left rounded-xl border text-xs flex flex-col gap-1.5 transition-all duration-200 w-full
                    ${selectedModel === 'htdemucs'
                      ? 'bg-primary/10 border-primary/40 text-primary shadow-glow-primary'
                      : 'bg-background-deep border-border text-gray-400 hover:border-border-strong hover:text-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-bold transition-colors ${selectedModel === 'htdemucs' ? 'text-primary' : 'text-gray-200 group-hover:text-gray-100'}`}>
                      Стандартная модель (4 стема)
                    </span>
                    {selectedModel === 'htdemucs' && (
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 leading-relaxed">
                    Вокал, Барабаны, Бас, Другое (включая гитары). Быстрый инференс.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModel('cascade_guitar')}
                  className={`
                    p-3.5 text-left rounded-xl border text-xs flex flex-col gap-1.5 transition-all duration-200 w-full
                    ${selectedModel === 'cascade_guitar'
                      ? 'bg-secondary/10 border-secondary/40 text-secondary shadow-glow'
                      : 'bg-background-deep border-border text-gray-400 hover:border-border-strong hover:text-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-bold transition-colors ${selectedModel === 'cascade_guitar' ? 'text-secondary' : 'text-gray-200 group-hover:text-gray-100'}`}>
                      Премиум каскад (5 стемов) ⭐
                    </span>
                    {selectedModel === 'cascade_guitar' && (
                      <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 leading-relaxed">
                    Вокал, Барабаны, Бас, Гитара и чистый стем «Другое» без утечек гитары.
                  </span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <Button variant="secondary" onClick={() => setPendingFile(null)}>Отмена</Button>
              <Button variant="primary" onClick={handleStartProcessing} leftIcon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              }>Запустить AI</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};