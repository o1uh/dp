import React from 'react';
import { Button } from '@/shared/ui/Button';

export const HomeView = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-background">
      <h1 className="text-5xl font-bold text-primary">Audio Platform</h1>
      <p className="text-xl text-gray-300">Интеллектуальная декомпозиция аудио</p>
      <Button variant="primary">Начать работу</Button>
    </div>
  );
};