import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  isLoading, 
  leftIcon,
  rightIcon,
  className = '', 
  ...props 
}) => {
  const baseStyle = [
    "relative inline-flex items-center justify-center gap-2 font-semibold tracking-wide",
    "rounded-xl transition-all duration-200 select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    "disabled:opacity-40 disabled:pointer-events-none",
    "active:scale-[0.97]",
  ].join(' ');

  const sizeStyles = {
    sm: "px-3.5 py-2 text-[10px]",
    md: "px-5 py-2.5 text-xs",
    lg: "px-6 py-3 text-sm",
  };

  const variants = {
    primary: [
      "bg-primary hover:bg-primary-hover text-white",
      "shadow-glow-primary hover:shadow-lg",
      "border border-primary/20",
    ].join(' '),
    secondary: [
      "bg-background-elevated hover:bg-background-deep text-gray-200 hover:text-gray-100",
      "border border-border hover:border-border-strong",
      "hover:shadow-soft",
    ].join(' '),
    danger: [
      "bg-accent-red/10 hover:bg-accent-red text-accent-red hover:text-white",
      "border border-accent-red/20 hover:border-accent-red/40",
      "transition-colors",
    ].join(' '),
    ghost: [
      "bg-transparent hover:bg-background-elevated text-gray-400 hover:text-gray-200",
    ].join(' '),
  };

  return (
    <button 
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{children || 'Обработка...'}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};