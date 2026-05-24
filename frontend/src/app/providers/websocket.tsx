'use client';

import React, { useEffect, useRef } from 'react';
import { useUserStore } from '@/entities/user/model/store';
import { useNotificationStore } from '@/entities/notification/model/store';
import { useFileStore } from '@/entities/file/model/store';
import { useQueryClient } from '@tanstack/react-query';

export default function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const token = useUserStore((state) => state.accessToken);
  const isAuth = useUserStore((state) => state.isAuth);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const resetFileStore = useFileStore((state) => state.reset);
  const queryClient = useQueryClient();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token || !isAuth) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const connect = () => {
      if (!isMounted) return;
      const url = `${process.env.NEXT_PUBLIC_WS_URL}/notifications?token=${token}`;
      ws.current = new WebSocket(url);

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'TrackReady') {
            if (data.status === 'processing') return;

            if (data.task_type === 'render' && data.status === 'completed' && data.download_url) {
              addNotification({
                event: data.event,
                message: 'Экспорт завершен. Скачивание архива...',
                status: 'completed',
                task_id: data.task_id
              });

              const link = document.createElement('a');
              link.href = data.download_url;
              link.setAttribute('download', 'stems.zip');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              resetFileStore();
              return;
            }

            addNotification({
              event: data.event,
              message: data.status === 'completed' ? 'Обработка файла завершена' : 'Ошибка обработки',
              status: data.status,
              task_id: data.task_id
            });

            resetFileStore();

            if (data.status === 'completed') {
                queryClient.invalidateQueries({ queryKey: ['tracks'] });
            }
          }
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };

      ws.current.onclose = () => {
        if (isMounted && isAuth) {
            timeoutId = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (ws.current) {
          ws.current.onclose = null;
          ws.current.close();
          ws.current = null;
      }
    };
  }, [token, isAuth, addNotification, queryClient, resetFileStore]);

  return <>{children}</>;
}