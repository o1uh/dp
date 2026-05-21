'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/entities/user/model/store';

export const HomeView = () => {
  const { isAuth, _hasHydrated } = useUserStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Если состояние хранилища десериализовано и пользователь авторизован, перенаправляем в библиотеку
  const isUserAuthenticated = isClient && _hasHydrated && isAuth;
  const targetLink = isUserAuthenticated ? '/library' : '/register';
  const buttonText = isUserAuthenticated ? 'В личный кабинет' : 'Начать декомпозицию';

  return (
    <div className="flex flex-col min-h-screen bg-background text-white selection:bg-primary/30">
      {/* Фоновое свечение */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-secondary/10 to-transparent blur-3xl pointer-events-none" />

      {/* Навигационная панель */}
      <header className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
        <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          AUDIO.AI
        </span>
        <div className="flex items-center gap-4">
          {isClient && isUserAuthenticated ? (
            <Link href="/library" className="text-sm font-medium px-4 py-2 bg-primary hover:bg-primary-hover rounded-full transition shadow-glow-primary">
              Перейти в кабинет
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition">
                Войти
              </Link>
              <Link href="/register" className="text-sm font-medium px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full border border-white/10 transition">
                Создать аккаунт
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero-секция */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/[0.08] rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-xs text-gray-300 font-medium tracking-wide uppercase">Demucs v4 Neural Engine</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
          Разделите трек на <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-pink-500">
            чистые изолированные дорожки
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
          Профессиональный инструмент декомпозиции аудио. Извлекайте вокал, ударные, бас и сторонние инструменты с хирургической точностью при помощи нейросетевых алгоритмов.
        </p>

        <div className="flex justify-center items-center w-full max-w-sm">
          <Link 
            href={targetLink} 
            className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-hover shadow-glow-primary rounded-full font-bold transition text-center text-sm"
          >
            {buttonText}
          </Link>
        </div>

        {/* Плейсхолдер UI */}
        <div className="w-full mt-20 p-2 bg-white/[0.01] border border-white/[0.04] rounded-2xl shadow-2xl backdrop-blur-3xl">
          <div className="bg-background-surface rounded-xl overflow-hidden aspect-[16/8] border border-white/[0.04] flex flex-col justify-between p-4">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/30" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/30" />
                <span className="w-3 h-3 rounded-full bg-green-500/30" />
              </div>
              <span className="text-xs font-mono text-gray-600">demucs_ht_v4_session_029.flac</span>
            </div>
            
            <div className="flex flex-col gap-3 my-6">
              {[
                { label: 'Vocals', color: 'from-purple-500/30', pct: '75%' },
                { label: 'Drums', color: 'from-blue-500/30', pct: '45%' },
                { label: 'Bass', color: 'from-pink-500/30', pct: '60%' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-16 text-left text-[11px] font-mono text-gray-400 uppercase tracking-wider">{item.label}</span>
                  <div className="flex-1 h-8 bg-white/[0.02] rounded border border-white/[0.04] relative overflow-hidden">
                    <div className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${item.color} to-transparent`} style={{ width: item.pct }} />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="h-6 flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>0:00</span>
              <span>1:30</span>
              <span>3:00</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};