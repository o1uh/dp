'use client';

import { Button } from '@/shared/ui/Button';
import { useUserStore } from '@/entities/user/model/store';
import { userApi } from '@/entities/user/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const LogoutBtn = () => {
  const router = useRouter();
  const { refreshToken, logout } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      if (refreshToken) await userApi.logout(refreshToken);
    } catch (e) {
      console.error(e);
    } finally {
      logout();
      router.push('/login');
    }
  };

  return (
    <Button variant="danger" onClick={handleLogout} isLoading={isLoading}>
      Выйти
    </Button>
  );
};