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

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 Б';
  const k = 1024;
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

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
    const userTitle = trackTitle.trim() || file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

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
            original_filename: `${userTitle}${file.name.substring(file.name.lastIndexOf('.'))}`,
            separation_mode: modelToUse,
            title: userTitle
          });

          if (initRes.is_duplicate) {
            if (initRes.stems && initRes.stems.length > 0) {
              setStatus('ready');
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
              setTimeout(() => reset(), 3000);
              return;
            } else {
              await apiClient.post('/tasks', {
                file_id: initRes.file_id,
                config: { model: modelToUse },
                title: userTitle
              });
              setStatus('ready');
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
              setTimeout(() => reset(), 3000);
              return;
            }
          }

          if (initRes.upload_url && initRes.file_id) {
            await fileApi.uploadToS3(initRes.upload_url, file, setProgress);
            await fileApi.confirmUpload(initRes.file_id);

            await apiClient.post('/tasks', {
              file_id: initRes.file_id,
              config: { model: modelToUse },
              title: userTitle
            });

            setStatus('ready');
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST(userId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
            setTimeout(() => reset(), 3000);
          }
        } catch (err: any) {
          setError(err.response?.data?.message || err.message || 'Ошибка передачи данных на S3');
        }
      };
    } catch (err) {
      setError('Ошибка локального декодирования файла');
    }
  };

  const isInteractive = status === 'idle';

  return (
    <>
      <div
        className={`group/upload relative w-full min-h-[260px] rounded-2xl transition-all duration-500 cursor-pointer overflow-hidden isolate ${
          isDragOver ? 'scale-[1.005]' : 'scale-100'
        }`}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) initFileSelection(f); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => status === 'idle' && fileInputRef.current?.click()}
      >
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background-surface/60 via-background-surface/30 to-background-deep/40" />
        <div className={`absolute inset-0 grid-pattern opacity-[0.35] transition-opacity duration-500 ${isDragOver ? 'opacity-60' : ''}`} />
        <div className={`absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] transition-all duration-700 ${
          isDragOver
            ? 'bg-primary/40'
            : 'bg-primary/15 group-hover/upload:bg-primary/25'
        }`} />
        <div className={`absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-[100px] transition-all duration-700 ${
          isDragOver
            ? 'bg-secondary/40'
            : 'bg-secondary/15 group-hover/upload:bg-secondary/25'
        }`} />

        {/* Animated beam sweep on drag */}
        {isDragOver && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-beam" />
          </div>
        )}

        {/* Dashed border with gradient */}
        <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
          isDragOver
            ? 'border-[2px] border-primary/70 shadow-[inset_0_0_60px_-10px_rgba(99,102,241,0.3)]'
            : status === 'idle'
              ? 'border-[1.5px] border-dashed border-white/10 group-hover/upload:border-primary/40'
              : 'border-[1.5px] border-dashed border-white/[0.06]'
        }`} />

        {/* Scanning line during upload */}
        {status === 'uploading' && (
          <div className="absolute inset-x-0 top-0 h-full overflow-hidden pointer-events-none rounded-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer"
                 style={{ backgroundSize: '200% 100%' }} />
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent animate-shimmer"
                 style={{ backgroundSize: '200% 100%' }} />
          </div>
        )}

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

        {/* IDLE STATE */}
        {status === 'idle' && !isDragOver && (
          <div className="relative flex flex-col items-center justify-center text-center px-6 py-10 animate-fade-in">
            {/* Orbiting icon */}
            <div className="relative w-20 h-20 mb-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 blur-xl animate-breathe" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-background-elevated to-background-deep border border-white/[0.08] flex items-center justify-center group-hover/upload:scale-105 group-hover/upload:border-primary/40 transition-all duration-500">
                <svg className="w-7 h-7 text-gray-300 group-hover/upload:text-primary transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              {/* Orbit dots */}
              <span className="absolute top-1/2 -right-1 w-2 h-2 rounded-full bg-primary shadow-glow-primary animate-orbit" style={{ transformOrigin: '-40px 0' }} />
              <span className="absolute top-1/2 -left-1 w-1.5 h-1.5 rounded-full bg-secondary shadow-glow animate-orbit" style={{ transformOrigin: '40px 0', animationDelay: '-3s' }} />
            </div>

            <h3 className="text-base font-bold text-gray-100 tracking-tight mb-1.5">
              Перетащите аудиофайл для декомпозиции
            </h3>
            <p className="text-xs text-gray-500 max-w-sm">
              или <span className="text-primary font-semibold underline underline-offset-4 decoration-primary/40 decoration-dashed">нажмите, чтобы выбрать</span> файл на диске
            </p>

            <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
              {['MP3', 'WAV', 'FLAC', 'AAC', 'OGG'].map((fmt) => (
                <span key={fmt} className="text-[9px] font-mono font-bold px-2 py-1 rounded-md bg-background-deep/60 border border-border/60 text-gray-400 tracking-wider">
                  {fmt}
                </span>
              ))}
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">до 500 МБ</span>
            </div>
          </div>
        )}

        {/* DRAG OVER STATE */}
        {isDragOver && (
          <div className="relative flex flex-col items-center justify-center text-center px-6 py-12 animate-fade-in-scale">
            <div className="relative w-24 h-24 mb-5">
              <div className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl animate-breathe" />
              <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-primary/30 to-secondary/20 border-2 border-primary/50 flex items-center justify-center animate-float-slow">
                <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
            </div>
            <p className="text-base font-bold text-primary tracking-tight">Отпустите файл для загрузки</p>
            <p className="text-xs text-gray-400 mt-1.5">Нейросеть уже готова к работе</p>
          </div>
        )}

        {/* HASHING STATE */}
        {status === 'hashing' && (
          <div className="relative flex flex-col items-center justify-center text-center px-6 py-12 animate-fade-in">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-2 rounded-full border border-primary/30 animate-orbit" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>
            <p className="text-[11px] font-mono text-primary font-bold uppercase tracking-[0.2em]">
              Генерация SHA-256
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5">Проверяем, не загружен ли файл ранее...</p>
          </div>
        )}

        {/* UPLOADING STATE */}
        {status === 'uploading' && (
          <div className="relative flex flex-col items-center justify-center text-center px-8 py-10 animate-fade-in">
            <div className="w-full max-w-md space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-lg animate-pulse" />
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 6m0 0l-4.5 4.5M12 6v13.5" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                    <span className="font-bold tracking-[0.2em] text-primary uppercase">Передача в S3</span>
                    <span className="tabular-nums text-gray-200 font-bold">{Math.round(progress)}%</span>
                  </div>
                  <div className="relative w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-secondary to-pink-500 rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">
                Потоковая загрузка в зашифрованное хранилище
              </p>
            </div>
          </div>
        )}

        {/* PROCESSING STATE */}
        {status === 'processing' && (
          <div className="relative flex flex-col items-center justify-center text-center px-6 py-12 animate-fade-in">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-secondary/30 to-pink-500/20 blur-2xl animate-breathe" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-secondary/20 to-pink-500/10 border border-secondary/30 flex items-center justify-center">
                {/* Mini sound wave animation */}
                <div className="flex items-end gap-1 h-7">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1 bg-gradient-to-t from-secondary to-pink-400 rounded-full animate-bounce"
                      style={{
                        height: '40%',
                        animationDelay: `${i * 120}ms`,
                        animationDuration: '1s'
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 rounded-full border border-secondary/30 animate-orbit" />
              <div className="absolute inset-0 rounded-full border border-pink-500/20 animate-orbit" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
            </div>
            <p className="text-[11px] font-mono text-secondary font-bold uppercase tracking-[0.2em]">
              Нейросеть разделяет трек
            </p>
            <p className="text-[10px] text-gray-500 mt-2 max-w-xs">Извлечение вокала, барабанов, баса и гитары — это может занять до 2 минут</p>
          </div>
        )}

        {/* READY STATE */}
        {status === 'ready' && (
          <div className="relative flex flex-col items-center justify-center text-center px-6 py-12 animate-fade-in-scale">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full bg-accent-green/30 blur-2xl animate-breathe" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-accent-green/20 to-emerald-500/10 border-2 border-accent-green/40 flex items-center justify-center">
                <svg className="w-7 h-7 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
            <p className="text-base font-bold text-accent-green tracking-tight">Успешно загружено!</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs">Трек появился в библиотеке и обрабатывается на сервере</p>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="relative flex flex-col items-center justify-center text-center px-6 py-10 animate-fade-in-scale">
            <div className="relative w-14 h-14 mb-4">
              <div className="absolute inset-0 rounded-full bg-accent-red/20 blur-xl" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-accent-red/20 to-red-500/10 border-2 border-accent-red/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-semibold text-accent-red max-w-md">{error}</p>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="mt-4 text-xs text-gray-400 hover:text-white underline underline-offset-4 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Corner tags */}
        {status === 'idle' && !isDragOver && (
          <>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[8px] font-mono text-gray-600 tracking-[0.2em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              AI Ready
            </div>
            <div className="absolute bottom-3 left-3 text-[8px] font-mono text-gray-700 tracking-widest">
              MAX 500 MB
            </div>
          </>
        )}
      </div>

      {/* Modal for decomposition settings */}
      {pendingFile && (
        <Modal onClose={() => setPendingFile(null)} title="Параметры декомпозиции" size="md">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background-deep/60 border border-border">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-200 truncate">{pendingFile.name}</p>
                <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                  {formatBytes(pendingFile.size)} · {pendingFile.type.replace('audio/', '').toUpperCase()}
                </p>
              </div>
            </div>

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
              <label className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-[0.2em]">
                Нейросетевая модель
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedModel('htdemucs')}
                  className={`
                    relative p-3.5 text-left rounded-xl border text-xs flex flex-col gap-1.5 transition-all duration-200 w-full overflow-hidden
                    ${selectedModel === 'htdemucs'
                      ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/40 text-primary shadow-glow-primary'
                      : 'bg-background-deep/60 border-border text-gray-400 hover:border-border-strong hover:text-gray-100 hover:bg-background-deep/80'
                    }
                  `}
                >
                  {selectedModel === 'htdemucs' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                  )}
                  <div className="flex items-center justify-between w-full relative">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full transition-colors ${selectedModel === 'htdemucs' ? 'bg-primary shadow-glow-primary' : 'bg-gray-600'}`} />
                      <span className="font-bold transition-colors text-gray-100">Стандартная модель</span>
                      <span className="text-[9px] font-mono text-gray-500">4 STEMS</span>
                    </span>
                    {selectedModel === 'htdemucs' && (
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 leading-relaxed pl-4">
                    Вокал, Барабаны, Бас, Другое (включая гитары). Быстрый инференс.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModel('cascade_guitar')}
                  className={`
                    relative p-3.5 text-left rounded-xl border text-xs flex flex-col gap-1.5 transition-all duration-200 w-full overflow-hidden
                    ${selectedModel === 'cascade_guitar'
                      ? 'bg-gradient-to-br from-secondary/15 to-pink-500/5 border-secondary/40 text-secondary shadow-glow'
                      : 'bg-background-deep/60 border-border text-gray-400 hover:border-border-strong hover:text-gray-100 hover:bg-background-deep/80'
                    }
                  `}
                >
                  {selectedModel === 'cascade_guitar' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-transparent to-transparent pointer-events-none" />
                  )}
                  <div className="flex items-center justify-between w-full relative">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full transition-colors ${selectedModel === 'cascade_guitar' ? 'bg-secondary shadow-glow' : 'bg-gray-600'}`} />
                      <span className="font-bold transition-colors text-gray-100">Премиум каскад</span>
                      <span className="text-[9px] font-mono text-secondary">5 STEMS</span>
                      <span className="text-[9px]">⭐</span>
                    </span>
                    {selectedModel === 'cascade_guitar' && (
                      <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 leading-relaxed pl-4">
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
