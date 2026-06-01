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
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold rounded-md tracking-wider
      ${isPro 
        ? 'bg-secondary/15 text-secondary border border-secondary/20' 
        : 'bg-slate-800/60 text-gray-500 border border-white/[0.04]'
      }
    `}>
      {isPro && (
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
      {text}
    </span>
  );
};