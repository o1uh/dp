import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  error, 
  label, 
  hint,
  leftIcon,
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3.5 py-3 bg-background-deep text-gray-100 text-xs 
            border rounded-xl outline-none transition-all duration-200 
            placeholder:text-gray-600
            ${leftIcon ? 'pl-10' : ''}
            ${error 
              ? 'border-accent-red/50 focus:border-accent-red focus:ring-2 focus:ring-accent-red/15' 
              : 'border-white/[0.06] focus:border-primary/50 focus:ring-2 focus:ring-primary/10'
            } 
            disabled:opacity-40 disabled:cursor-not-allowed
            hover:border-white/[0.12]
          `}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[10px] font-mono font-semibold text-accent-red flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </span>
      )}
      {hint && !error && (
        <span className="text-[10px] font-mono text-gray-600">{hint}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';