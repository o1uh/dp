'use client';

import React, { useEffect } from 'react';
import { useNotificationStore } from '@/entities/notification/model/store';

export const ToastContainer = () => {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notif) => (
        <Toast key={notif.id} notif={notif} onRemove={removeNotification} />
      ))}
    </div>
  );
};

const Toast = ({ notif, onRemove }: { notif: any; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notif.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notif.id, onRemove]);

  const getConfig = () => {
    switch (notif.status) {
      case 'completed':
        return { 
          border: 'border-accent-green/30', 
          bg: 'bg-accent-green/10', 
          icon: 'bg-accent-green/20', 
          iconSvg: 'text-accent-green',
          label: 'Готово'
        };
      case 'processing':
        return { 
          border: 'border-accent-yellow/30', 
          bg: 'bg-accent-yellow/10', 
          icon: 'bg-accent-yellow/20', 
          iconSvg: 'text-accent-yellow',
          label: 'Обработка'
        };
      case 'error':
        return { 
          border: 'border-accent-red/30', 
          bg: 'bg-accent-red/10', 
          icon: 'bg-accent-red/20', 
          iconSvg: 'text-accent-red',
          label: 'Ошибка'
        };
      default:
        return { 
          border: 'border-white/[0.08]', 
          bg: 'bg-background-surface', 
          icon: 'bg-white/[0.06]', 
          iconSvg: 'text-gray-400',
          label: 'Уведомление'
        };
    }
  };

  const config = getConfig();

  return (
    <div 
      className={`
        ${config.bg} ${config.border} border rounded-2xl p-4 
        shadow-elevated backdrop-blur-xl animate-slide-in-right
        flex items-start gap-3 min-w-[280px]
      `}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-xl ${config.icon} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        {notif.status === 'completed' ? (
          <svg className={`w-4 h-4 ${config.iconSvg}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : notif.status === 'processing' ? (
          <svg className={`w-4 h-4 ${config.iconSvg} animate-spin`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className={`w-4 h-4 ${config.iconSvg}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">{config.label}</span>
        </div>
        <p className="text-xs text-gray-200 leading-relaxed">{notif.message}</p>
        {notif.task_id && (
          <p className="text-[9px] font-mono text-gray-600 mt-1 truncate">ID: {notif.task_id}</p>
        )}
      </div>

      {/* Close */}
      <button 
        onClick={() => onRemove(notif.id)} 
        className="text-gray-600 hover:text-gray-300 transition p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/[0.04] flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};