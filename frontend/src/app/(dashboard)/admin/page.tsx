'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/entities/user/model/store';

export default function AdminPage() {
  const router = useRouter();
  const profile = useUserStore((state) => state.profile);
  const _hasHydrated = useUserStore((state) => state._hasHydrated);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (_hasHydrated) {
      if (profile?.role_name !== 'admin') {
        router.replace('/library');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [_hasHydrated, profile, router]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest animate-pulse">Проверка прав...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-100">Панель администратора</h1>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Управление платформой</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Всего пользователей', value: '—', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
          { label: 'Активных задач', value: '—', icon: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z' },
          { label: 'Хранилище S3', value: '—', icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125' },
          { label: 'Обработано треков', value: '—', icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66A2.25 2.25 0 0018 12.553v-3.75m0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z' },
        ].map((stat, i) => (
          <div key={i} className="p-5 rounded-2xl bg-background-surface/30 border border-white/[0.04]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold text-gray-100">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Placeholder */}
      <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.06] text-center">
        <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-4.34 4.34a1 1 0 01-1.42 0l-2.25-2.25a1 1 0 010-1.42l4.34-4.34m4.34-4.34l4.34-4.34a1 1 0 011.42 0l2.25 2.25a1 1 0 010 1.42l-4.34 4.34M12 12l4.34 4.34m0 0L12 12l4.34-4.34M12 12l-4.34 4.34M12 12l4.34-4.34" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Модуль администрирования в разработке</p>
        <p className="text-xs text-gray-700 mt-1">Здесь будет отображаться полная статистика и управление платформой</p>
      </div>
    </div>
  );
}