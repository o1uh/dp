import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input: React.FC<InputProps> = ({ error, label, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-3.5 py-3 bg-[#05070B] text-gray-100 text-xs border rounded-lg outline-none transition-all duration-200 placeholder:text-gray-600
            ${error 
              ? 'border-accent-red/50 focus:border-accent-red focus:ring-1 focus:ring-accent-red/20' 
              : 'border-white/[0.06] focus:border-primary focus:ring-1 focus:ring-primary/20'
            } 
            disabled:opacity-40 disabled:cursor-not-allowed`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[10px] font-mono font-semibold text-accent-red uppercase tracking-wider">
          {error}
        </span>
      )}
    </div>
  );
};