'use client';

import React, { useEffect } from 'react';
import { useNotificationStore } from '@/entities/notification/model/store';

export const ToastContainer = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
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

  const getBgColor = () => {
    if (notif.status === 'completed') return 'bg-accent-green text-white';
    if (notif.status === 'processing') return 'bg-accent-yellow text-slate-950 font-bold';
    return 'bg-accent-red text-white';
  };

  return (
    <div className={`${getBgColor()} px-4 py-3 rounded shadow-lg flex justify-between items-center w-72 animate-fade-in-up border border-white/5`}>
      <span className="text-xs tracking-wide uppercase font-semibold">{notif.message}</span>
      <button onClick={() => onRemove(notif.id)} className="ml-4 hover:opacity-70 transition text-sm">
        &times;
      </button>
    </div>
  );
};