'use client';

import React from 'react';
import { useUserStore } from '@/entities/user/model/store';
import { Avatar } from '@/entities/user/ui/Avatar';
import { LogoutBtn } from '@/features/auth/LogoutBtn';

export const Header = () => {
  const profile = useUserStore((state) => state.profile);

  return (
    <header className="h-16 border-b border-slate-800 bg-background flex items-center justify-between px-6">
      <div className="text-xl font-bold text-primary">AudioPlatform</div>
      
      <div className="flex items-center gap-4">
        {profile && (
          <>
            <span className="text-sm text-gray-300">{profile.username}</span>
            <Avatar url={profile.avatar_url} name={profile.username} size="sm" />
            <LogoutBtn />
          </>
        )}
      </div>
    </header>
  );
};