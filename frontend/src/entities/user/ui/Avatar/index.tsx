import React, { useState } from 'react';

interface AvatarProps {
  url?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ url, name, size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
  };

  const initials = name
    ? name.split(' ').map(s => s[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  if (!url || hasError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-bold rounded-full flex-shrink-0 ${sizeClasses[size]}`}>
        {initials}
      </div>
    );
  }

  return (
    <div className={`relative flex-shrink-0 ${sizeClasses[size]}`}>
      <img
        src={url}
        alt={name}
        onError={() => setHasError(true)}
        className={`rounded-full object-cover w-full h-full ring-2 ring-white/[0.06]`}
      />
    </div>
  );
};