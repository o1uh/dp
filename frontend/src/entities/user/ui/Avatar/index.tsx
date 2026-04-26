import React, { useState } from 'react';

interface AvatarProps {
  url?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ url, name, size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
  };

  const initials = name ? name.substring(0, 2).toUpperCase() : 'U';

  if (!url || hasError) {
    return (
      <div className={`flex items-center justify-center bg-secondary text-white rounded-full font-bold ${sizeClasses[size]}`}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      onError={() => setHasError(true)}
      className={`rounded-full object-cover ${sizeClasses[size]}`}
    />
  );
};