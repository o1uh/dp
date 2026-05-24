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
      <div className="flex items-center justify-center h-full text-gray-500">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">Проверка прав доступа...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-2xl font-bold text-red-500 mb-4">Панель администратора</h1>
      <div className="bg-slate-800 p-8 rounded-lg border border-dashed border-slate-600">
        <p className="text-gray-400">Модуль администрирования в разработке.</p>
      </div>
    </div>
  );
}