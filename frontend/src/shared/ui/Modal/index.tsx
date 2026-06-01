'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, size = 'sm', title }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose, mounted]);

  if (!mounted || typeof document === 'undefined') return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#030508]/80 backdrop-blur-md animate-fade-in" />
      
      {/* Modal Panel */}
      <div 
        className={`relative w-full ${sizeClasses[size]} transform animate-fade-in-scale`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-background-surface border border-white/[0.08] rounded-2xl shadow-elevated overflow-hidden">
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="text-sm font-bold text-gray-200">{title}</h3>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-white transition p-1 rounded-lg hover:bg-white/[0.04] -mr-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Close button (if no title) */}
          {!title && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-50 text-gray-500 hover:text-white transition p-1 rounded-lg hover:bg-white/[0.04]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Content */}
          <div className={title ? 'p-6' : 'p-6'}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};