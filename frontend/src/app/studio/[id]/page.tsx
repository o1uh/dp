'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserStore } from '@/entities/user/model/store';
import { StudioView } from '@/views/studio';

export default function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('task_id');
  
  const { isAuth, _hasHydrated } = useUserStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (_hasHydrated && !isAuth) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuth, router]);

  if (!mounted || !_hasHydrated || !isAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-secondary/20 border-b-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
          </div>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">ПРОВЕРКА АВТОРИЗАЦИИ...</span>
        </div>
      </div>
    );
  }

  return <StudioView sessionId={id} taskId={taskId} />;
}