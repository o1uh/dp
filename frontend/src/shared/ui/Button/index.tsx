import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyle = "relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase select-none transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white shadow-glow-primary active:scale-[0.98]",
    secondary: "bg-white/[0.02] hover:bg-white/[0.06] text-gray-200 border border-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]",
    danger: "bg-accent-red/10 hover:bg-accent-red text-accent-red hover:text-white border border-accent-red/20 transition-colors active:scale-[0.98]",
    ghost: "bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>ОБРАБОТКА...</span>
        </>
      ) : children}
    </button>
  );
};