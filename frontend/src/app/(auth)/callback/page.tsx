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
      <span className="text-xl animate-pulse text-primary">Авторизация...</span>
    </div>
  );
}