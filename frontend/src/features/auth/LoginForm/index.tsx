'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api/rest';
import { useUserStore } from '@/entities/user/model/store';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { userApi } from '@/entities/user/api';

export const LoginForm = () => {
  const router = useRouter();
  const setTokens = useUserStore((state) => state.setTokens);
  const setProfile = useUserStore((state) => state.setProfile);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      setTokens(data.access_token, data.refresh_token);
      
      const profile = await userApi.getProfile();
      setProfile(profile);
      
      router.push('/library');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <Input 
        label="Email" 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />
      <Input 
        label="Пароль" 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        required 
      />
      {error && <span className="text-red-500 text-sm">{error}</span>}
      <Button type="submit" isLoading={isLoading}>Войти</Button>
    </form>
  );
};