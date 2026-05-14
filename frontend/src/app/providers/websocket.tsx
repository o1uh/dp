'use client';

import React, { useEffect, useRef } from 'react';
import { useUserStore } from '@/entities/user/model/store';
import { useNotificationStore } from '@/entities/notification/model/store';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/api/query-keys';

export default function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const token = useUserStore((state) => state.accessToken);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

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

            addNotification({
              event: data.event,
              message: data.status === 'completed' ? 'Обработка файла завершена' : 'Ошибка обработки',
              status: data.status,
              task_id: data.task_id
            });
            if (data.status === 'completed') {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST() });
            }
          }
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };

      ws.current.onclose = () => {
        if (isMounted) {
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
      }
    };
  }, [token, addNotification, queryClient]);

  return <>{children}</>;
}