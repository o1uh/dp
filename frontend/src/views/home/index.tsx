'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/entities/user/model/store';

export const HomeView = () => {
  const { isAuth, _hasHydrated } = useUserStore();
  const [isClient, setIsClient] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setIsClient(true);
    
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    }

    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const isUserAuthenticated = isClient && _hasHydrated && isAuth;
  const targetLink = isUserAuthenticated ? '/library' : '/register';
  const buttonText = isUserAuthenticated ? 'В личный кабинет' : 'Начать декомпозицию';

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-gray-100 selection:bg-primary/30 overflow-hidden noise-bg">
      {/* Ambient glow that follows mouse */}
      <div 
        className="fixed pointer-events-none w-[600px] h-[600px] rounded-full bg-gradient-radial from-secondary/5 to-transparent blur-3xl transition-all duration-1000"
        style={{ left: mousePos.x - 300, top: mousePos.y - 300 }}
      />

      {/* Top gradient aura */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-primary/5 via-secondary/5 to-transparent blur-3xl pointer-events-none" />

      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ===== NAVBAR ===== */}
      <header className="relative z-20 max-w-7xl mx-auto w-full flex items-center justify-between px-6 py-5 select-none">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <span className="text-lg font-black tracking-tight">
            <span className="text-gray-100">AUDIO</span>
            <span className="text-primary">.</span>
            <span className="text-secondary">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {/* Переключатель темы в навигации */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-background-surface border border-border hover:border-border-strong text-gray-400 hover:text-gray-100 transition mr-2"
            title="Сменить тему"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          {isClient && isUserAuthenticated ? (
            <Link 
              href="/library" 
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover rounded-xl text-xs font-bold text-white transition-all shadow-glow-primary hover:shadow-lg active:scale-[0.97]"
            >
              Перейти в кабинет
            </Link>
          ) : (
            <>
              <Link 
                href="/login" 
                className="px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-gray-100 transition rounded-xl hover:bg-white/[0.04]"
              >
                Войти
              </Link>
              <Link 
                href="/register" 
                className="px-5 py-2.5 bg-background-surface hover:bg-background-deep border border-border hover:border-border-strong rounded-xl text-xs font-semibold text-gray-200 transition-all active:scale-[0.97]"
              >
                Создать аккаунт
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full flex flex-col items-center text-center px-6 pt-16 pb-24">
        
        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-in-up select-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background-surface border border-border rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
            </span>
            <span className="text-[11px] text-gray-400 font-medium">Demucs v4 Neural Engine</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 border border-secondary/25 rounded-full shadow-glow">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="text-[11px] text-secondary font-semibold">Cascade Guitar Separation v4</span>
          </div>
        </div>

        {/* Headline (Исправлено на адаптивный text-gray-100) */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05] text-gray-100 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Разделите трек на <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-pink-400">
            чистые изолированные дорожки
          </span>
        </h1>

        {/* Subtitle (Исправлено на адаптивный text-gray-300) */}
        <p className="text-base md:text-lg text-gray-300 max-w-2xl mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Профессиональный инструмент декомпозиции аудио. 
          Извлекайте вокал, ударные, бас, гитару и другие инструменты с хирургической точностью при помощи нейросетевых алгоритмов.
        </p>

        {/* CTA */}
        <div className="flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Link 
            href={targetLink} 
            className="group relative px-8 py-4 bg-primary hover:bg-primary-hover text-white shadow-glow-primary hover:shadow-lg rounded-2xl font-bold transition-all text-sm active:scale-[0.97] overflow-hidden"
          >
            <span className="relative z-10">{buttonText}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>
          <Link 
            href="/catalog" 
            className="px-6 py-4 bg-background-surface hover:bg-background-deep border border-border text-gray-200 hover:text-gray-100 rounded-2xl text-xs font-semibold transition-all"
          >
            Изучить каталог
          </Link>
        </div>

        {/* ===== DAW Preview ===== */}
        <div className="w-full mt-20 animate-fade-in-up shadow-glow-primary" style={{ animationDelay: '0.4s' }}>
          <div className="p-1.5 bg-gradient-to-b from-white/[0.06] to-transparent rounded-2xl">
            <div className="bg-background-surface rounded-xl overflow-hidden border border-border">
              
              {/* Title bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-600">session_demucs_v4_029.flac</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-gray-600">AI Processing</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                </div>
              </div>
              
              {/* Waveform tracks */}
              <div className="px-5 py-5 flex flex-col gap-2.5">
                {[
                  { label: 'VOCALS', color: 'from-pink-500/40 to-pink-500/10', pct: '72%', val: 'Vocals', accent: '#EC4899' },
                  { label: 'DRUMS', color: 'from-cyan-500/40 to-cyan-500/10', pct: '43%', val: 'Drums', accent: '#06B6D4' },
                  { label: 'BASS', color: 'from-emerald-500/40 to-emerald-500/10', pct: '58%', val: 'Bass', accent: '#10B981' },
                  { label: 'GUITAR', color: 'from-amber-500/40 to-amber-500/10', pct: '76%', val: 'Guitar (Premium)', accent: '#F59E0B' },
                  { label: 'OTHER', color: 'from-violet-500/40 to-violet-500/10', pct: '35%', val: 'Other (Cleaned)', accent: '#8B5CF6' },
                ].map((track, i) => (
                  <div key={i} className="group flex items-center gap-4">
                    <span className="w-20 text-[10px] font-mono font-bold text-gray-500 tracking-wider text-right">
                      {track.label}
                    </span>
                    <div className="flex-1 h-9 bg-background-deep border border-border rounded-lg relative overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r rounded-lg transition-all duration-500 group-hover:brightness-125"
                        style={{ width: track.pct, background: `linear-gradient(90deg, ${track.accent}40, ${track.accent}08)` }}
                      />
                      <div className="relative z-10 h-full flex items-center px-3">
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-3 rounded-full opacity-30" style={{ width: track.pct, background: track.accent }}>
                            <div className="h-full w-full rounded-full" style={{ 
                              background: `repeating-linear-gradient(90deg, transparent, transparent 2px, ${track.accent} 2px, ${track.accent} 4px)` 
                            }} />
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-gray-300">{track.val}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-background-deep border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border text-[10px] font-mono text-gray-600">
                <div className="flex items-center gap-4">
                  <span>00:00</span>
                  <div className="w-40 h-0.5 bg-background-deep rounded-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-primary to-secondary rounded-full animate-progress" />
                  </div>
                </div>
                <span>03:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Feature Grid ===== */}
        <div className="w-full mt-24 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              ),
              title: 'Нейросетевая точность',
              desc: 'Алгоритмы Demucs v4 с каскадным разделением гитары обеспечивают наилучшее качество разделения в индустрии.'
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
              title: 'Мгновенная обработка',
              desc: 'Загрузите трек и получите готовые стемы за минуты. Асинхронная очередь задач не блокирует работу.'
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              title: 'DAW-микшер онлайн',
              desc: 'Встроенный веб-микшер с регулировкой громкости, панорамой и экпортом готового сведения прямо в браузере.'
            },
          ].map((feature, i) => (
            <div 
              key={i} 
              className="group p-6 rounded-2xl bg-background-surface border border-border hover:border-border-strong transition-all duration-300 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-border flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-sm font-bold text-gray-200 mb-2">{feature.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* ===== Footer ===== */}
        <footer className="w-full mt-24 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-mono text-gray-600">
          <div className="flex items-center gap-4">
            <span>© 2026 AUDIO.AI</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Built with Demucs</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>v2.0.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-gray-400 transition cursor-pointer">Документация</span>
            <span className="hover:text-gray-400 transition cursor-pointer">API</span>
            <span className="hover:text-gray-400 transition cursor-pointer">Telegram</span>
          </div>
        </footer>
      </main>
    </div>
  );
};