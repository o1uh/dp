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

  const bgColor = notif.status === 'completed' ? 'bg-green-600' : 'bg-red-600';

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex justify-between items-center w-64 animate-fade-in-up`}>
      <span className="text-sm">{notif.message}</span>
      <button onClick={() => onRemove(notif.id)} className="ml-4 text-white hover:text-gray-200">
        &times;
      </button>
    </div>
  );
};