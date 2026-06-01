'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/shared/api/rest';
import { useUserStore } from '@/entities/user/model/store';
import { userApi } from '@/entities/user/api';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useUserStore((state) => state.setTokens);
  const setProfile = useUserStore((state) => state.setProfile);

  useEffect(() => {
    const code = searchParams.get('code');
    const provider = searchParams.get('provider') || 'google';

    if (code) {
      apiClient.post(`/auth/${provider}/callback`, { code })
        .then(async ({ data }) => {
          setTokens(data.access_token, data.refresh_token);
          const profile = await userApi.getProfile();
          setProfile(profile);
          router.push('/library');
        })
        .catch(() => {
          router.push('/login?error=oauth_failed');
        });
    } else {
      router.push('/login');
    }
  }, [searchParams, router, setTokens, setProfile]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-secondary/20 border-b-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-gray-300">Авторизация...</span>
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">OAuth</span>
        </div>
      </div>
    </div>
  );
}