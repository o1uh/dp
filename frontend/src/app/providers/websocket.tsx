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
    console.log(`[WS PROVIDER EFFECT] Running. Authentication state: ${isAuth}, Token present: ${!!token}`);
    if (!token || !isAuth) {
      if (ws.current) {
        console.log('[WS PROVIDER EFFECT] Closing existing socket connection due to logout/deauth');
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const connect = () => {
      if (!isMounted) {
        console.log('[WS PROVIDER SOCKET] Connection aborted: Component is unmounted');
        return;
      }
      const url = `${process.env.NEXT_PUBLIC_WS_URL}/notifications?token=${token}`;
      console.log(`[WS PROVIDER SOCKET] Establishing connection to endpoint: ${url}`);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('[WS PROVIDER SOCKET] Connection successfully established and active.');
      };

      ws.current.onmessage = (event) => {
        console.log('[WS PROVIDER SOCKET] Incoming message frame received:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('[WS PROVIDER SOCKET] Decoded JSON payload:', data);
          
          if (data.event === 'TrackReady') {
            console.log(`[WS PROVIDER SOCKET] Event 'TrackReady' caught. Processing status: ${data.status}`);
            if (data.status === 'processing') {
              console.log('[WS PROVIDER SOCKET] Track status is processing. Ignoring rendering trigger...');
              return;
            }

            if (data.task_type === 'render' && data.status === 'completed' && data.download_url) {
              console.log('[WS PROVIDER SOCKET] Render task complete event detected. Dispatching toast and triggering auto-download...');
              addNotification({
                event: data.event,
                message: 'Экспорт завершен. Скачивание архива...',
                status: 'completed',
                task_id: data.task_id
              });

              console.log(`[WS PROVIDER SOCKET] Generating virtual anchor DOM element to dispatch file download for url: ${data.download_url}`);
              const link = document.createElement('a');
              link.href = data.download_url;
              link.setAttribute('download', 'stems.zip');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              console.log('[WS PROVIDER SOCKET] Virtual click dispatched. Anchor element garbage-collected.');

              console.log('[WS PROVIDER SOCKET] Flushing local file store states...');
              resetFileStore();
              return;
            }

            console.log(`[WS PROVIDER SOCKET] Dispatching UI Toast notification. Task: ${data.task_id}, Status: ${data.status}`);
            addNotification({
              event: data.event,
              message: data.status === 'completed' ? 'Обработка файла завершена' : 'Ошибка обработки',
              status: data.status,
              task_id: data.task_id
            });

            console.log('[WS PROVIDER SOCKET] Flushing local file store states...');
            resetFileStore();

            if (data.status === 'completed') {
                console.log('[WS PROVIDER SOCKET] Invalidation triggered. Refreshing React Query caches for keys: ["tracks"], ["profile", "me"]');
                queryClient.invalidateQueries({ queryKey: ['tracks'] });
                queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
            }
          }
        } catch (e) {
          console.error("[WS PROVIDER SOCKET ERROR] Failed to parse socket message:", e);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WS PROVIDER SOCKET ERROR] Socket connection encountered an error:', error);
      };

      ws.current.onclose = (event) => {
        console.warn(`[WS PROVIDER SOCKET CLOSE] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        if (isMounted && isAuth) {
            console.log('[WS PROVIDER SOCKET] Reconnection scheduled in 5000ms...');
            timeoutId = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      console.log('[WS PROVIDER] Destroying WebSocket provider context. Clearing loops and connection listeners...');
      isMounted = false;
      clearTimeout(timeoutId);
      if (ws.current) {
          ws.current.onclose = null;
          ws.current.close();
          ws.current = null;
          console.log('[WS PROVIDER] WebSocket connection closed on clean up.');
      }
    };
  }, [token, isAuth, addNotification, queryClient, resetFileStore]);

  return <>{children}</>;
}