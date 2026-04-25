'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/shared/api/rest';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

export const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/reset-password', { token, new_password: password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сброса пароля');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return <div className="text-green-500">Пароль успешно изменен. Перенаправление...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <Input 
        label="Новый пароль" 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        required 
      />
      {error && <span className="text-red-500 text-sm">{error}</span>}
      <Button type="submit" isLoading={isLoading} disabled={!token}>Обновить пароль</Button>
    </form>
  );
};