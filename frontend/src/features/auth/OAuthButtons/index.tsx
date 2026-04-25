import React from 'react';
import { Button } from '@/shared/ui/Button';

export const OAuthButtons = () => {
  const handleOAuth = (provider: string) => {
    // в будущем будет редирект на эндпоинт бэкенда /api/auth/{provider}
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/${provider}`;
  };

  return (
    <div className="flex gap-2 w-full max-w-sm mt-4">
      <Button variant="secondary" className="flex-1" onClick={() => handleOAuth('google')}>
        Google
      </Button>
      <Button variant="secondary" className="flex-1" onClick={() => handleOAuth('vk')}>
        VK
      </Button>
    </div>
  );
};