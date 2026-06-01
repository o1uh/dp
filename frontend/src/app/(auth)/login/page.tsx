'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/entities/user/model/store';
import { LoginForm } from '@/features/auth/LoginForm';
import { OAuthButtons } from '@/features/auth/OAuthButtons';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { isAuth, _hasHydrated } = useUserStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (_hasHydrated && isAuth) {
      router.replace('/library');
    }
  }, [_hasHydrated, isAuth, router]);

  if (!mounted || !_hasHydrated || isAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-background overflow-hidden">
      {/* Background gradient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-gradient-to-b from-primary/5 via-secondary/5 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Left decorative panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-background-surface via-background to-background-deep border-r border-white/[0.04] items-center justify-center p-12">
        <div className="max-w-sm text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-primary">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight">
              <span className="text-white">AUDIO</span>
              <span className="text-primary">.</span>
              <span className="text-secondary">AI</span>
            </span>
          </Link>

          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-gray-200">Enterprise-grade security</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ваши аудиофайлы шифруются end-to-end. Все вычисления производятся в изолированной среде.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-gray-200">AI-powered separation</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Нейросеть Demucs v4 разделяет треки на 4-5 изолированных стемов с хирургической точностью.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight">
              <span className="text-white">AUDIO</span>
              <span className="text-primary">.</span>
              <span className="text-secondary">AI</span>
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Добро пожаловать</h1>
            <p className="text-sm text-gray-500">Войдите в аккаунт для работы с платформой</p>
          </div>

          <LoginForm />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[10px] font-mono text-gray-600 bg-background">ИЛИ</span>
            </div>
          </div>

          <OAuthButtons />

          <p className="mt-6 text-center text-xs text-gray-500">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-primary hover:text-primary-light font-semibold transition">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}