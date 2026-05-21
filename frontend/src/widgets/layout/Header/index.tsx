'use client';

import React from 'react';
import { useUserStore } from '@/entities/user/model/store';
import { Avatar } from '@/entities/user/ui/Avatar';
import { UserBadge } from '@/entities/user/ui/UserBadge';
import { LogoutBtn } from '@/features/auth/LogoutBtn';

export const Header = () => {
  const profile = useUserStore((state) => state.profile);

  return (
    <header className="h-16 border-b border-white/[0.04] bg-[#090D16]/60 backdrop-blur-md flex items-center justify-end px-6 sticky top-0 z-40 select-none">
      <div className="flex items-center gap-6">
        {profile && (
          <div className="flex items-center gap-4 pl-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-gray-200 leading-none mb-1">{profile.username}</span>
              <UserBadge roleName={profile.role_name} specialization={profile.profile_specialization} />
            </div>
            <Avatar url={profile.avatar_url} name={profile.username} size="sm" />
            <div className="h-6 w-[1px] bg-white/[0.04]" />
            <LogoutBtn />
          </div>
        )}
      </div>
    </header>
  );
};