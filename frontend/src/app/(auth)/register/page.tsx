'use client';

import { RegisterForm } from '@/features/auth/RegisterForm';
import { OAuthButtons } from '@/features/auth/OAuthButtons';
import Link from 'next/link';

export default function RegisterPage() {
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight">
              <span className="text-white">AUDIO</span>
              <span className="text-primary">.</span>
              <span className="text-secondary">AI</span>
            </span>
          </Link>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-4xl mb-4">🎧</div>
            <h3 className="text-base font-bold text-gray-200 mb-2">Начните бесплатно</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Создайте аккаунт и получите доступ к полному функционалу платформы: 
              загрузка треков, AI-декомпозиция, веб-микшер, экспорт и публичный каталог.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                🎵 4-5 стемов
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-secondary/10 text-secondary font-semibold border border-secondary/20">
                ⚡ Demucs v4
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent-green/10 text-accent-green font-semibold border border-accent-green/20">
                ∞ Безлимит
              </span>
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
            <h1 className="text-2xl font-bold text-white mb-2">Создать аккаунт</h1>
            <p className="text-sm text-gray-500">Зарегистрируйтесь для доступа к платформе</p>
          </div>

          <RegisterForm />

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
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-primary hover:text-primary-light font-semibold transition">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}