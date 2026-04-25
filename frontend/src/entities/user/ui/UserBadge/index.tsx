import React from 'react';

interface UserBadgeProps {
  roleName?: string;
  specialization?: string;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ roleName, specialization }) => {
  const text = specialization || roleName;
  if (!text) return null;

  const isPro = roleName === 'admin' || roleName === 'b2b_client';

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded ${isPro ? 'bg-secondary text-white' : 'bg-slate-700 text-gray-300'}`}>
      {text}
    </span>
  );
};