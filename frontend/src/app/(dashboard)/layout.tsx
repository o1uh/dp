'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/entities/user/model/store';
import { Sidebar } from '@/widgets/layout/Sidebar';
import { Header } from '@/widgets/layout/Header';
import { MiniPlayer } from '@/widgets/global_player/MiniPlayer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuth, _hasHydrated } = useUserStore();

  useEffect(() => {
    if (_hasHydrated && !isAuth) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuth, router]);

  if (!_hasHydrated || !isAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-primary">
        <span className="animate-pulse">Проверка сессии...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 pb-24 relative">
          {children}
        </main>
        <MiniPlayer />
      </div>
    </div>
  );
}