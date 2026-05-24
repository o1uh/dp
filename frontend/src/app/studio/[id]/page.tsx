'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/entities/user/model/store';
import { StudioView } from '@/views/studio';

export default function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
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
      <div className="flex h-screen items-center justify-center bg-[#090D16]">
        <span className="text-xs font-mono tracking-wider text-gray-500 uppercase">ПРОВЕРКА АВТОРИЗАЦИИ...</span>
      </div>
    );
  }

  return <StudioView sessionId={id} />;
}