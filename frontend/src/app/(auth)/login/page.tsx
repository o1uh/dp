'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/entities/user/model/store';
import { LoginForm } from '@/features/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { isAuth, _hasHydrated } = useUserStore();

  useEffect(() => {
    if (_hasHydrated && isAuth) {
      router.replace('/library');
    }
  }, [_hasHydrated, isAuth, router]);

  if (!_hasHydrated || isAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <span className="text-primary animate-pulse">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-3xl font-bold mb-6 text-primary">Вход</h1>
      <LoginForm />
      <p className="mt-4 text-sm text-gray-400">
        Нет аккаунта? <Link href="/register" className="text-primary hover:underline">Зарегистрироваться</Link>
      </p>
    </div>
  );
}