'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api/rest';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

export const RegisterForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/register', formData);
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <Input 
        label="Имя пользователя" 
        value={formData.username} 
        onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
        required 
      />
      <Input 
        label="Email" 
        type="email" 
        value={formData.email} 
        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
        required 
      />
      <Input 
        label="Пароль" 
        type="password" 
        value={formData.password} 
        onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
        required 
      />
      {error && <span className="text-red-500 text-sm">{error}</span>}
      <Button type="submit" isLoading={isLoading}>Зарегистрироваться</Button>
    </form>
  );
};