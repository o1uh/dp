import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WebSocketProvider from '@/app/providers/websocket';
import { ToastContainer } from '@/features/notifications/ToastContainer';
import { useUserStore } from '@/entities/user/model/store';
import { useNotificationStore } from '@/entities/notification/model/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

class MockWebSocket {
  url: string;
  onmessage: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }
  close() {}
  send() {}
}

describe('WebSocket Event Handling', () => {
  let wsInstance: MockWebSocket;

  beforeEach(() => {
    vi.stubGlobal('WebSocket', vi.fn((url) => {
      wsInstance = new MockWebSocket(url);
      return wsInstance;
    }));

    useUserStore.setState({ accessToken: 'valid_test_token' });
    useNotificationStore.setState({ notifications: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles TrackReady event and renders Toast', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <ToastContainer />
        </WebSocketProvider>
      </QueryClientProvider>
    );

    act(() => {
      if (wsInstance && wsInstance.onmessage) {
        wsInstance.onmessage({
          data: JSON.stringify({
            event: 'TrackReady',
            status: 'completed',
            task_id: '123'
          })
        });
      }
    });

    const toastMessage = await screen.findByText('Обработка файла завершена');
    expect(toastMessage).toBeInTheDocument();

    const state = useNotificationStore.getState();
    expect(state.notifications.length).toBe(1);
    expect(state.notifications[0].event).toBe('TrackReady');
    expect(state.notifications[0].status).toBe('completed');
  });

  it('handles failed TrackReady event', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <ToastContainer />
        </WebSocketProvider>
      </QueryClientProvider>
    );

    act(() => {
      if (wsInstance && wsInstance.onmessage) {
        wsInstance.onmessage({
          data: JSON.stringify({
            event: 'TrackReady',
            status: 'failed',
            task_id: '123'
          })
        });
      }
    });

    const toastMessage = await screen.findByText('Ошибка обработки');
    expect(toastMessage).toBeInTheDocument();
  });
});