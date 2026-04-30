import { create } from 'zustand';

interface NotificationPayload {
  id: string;
  event: string;
  message: string;
  status: string;
}

interface NotificationState {
  notifications: NotificationPayload[];
  addNotification: (notification: Omit<NotificationPayload, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notif) => set((state) => ({
    notifications: [...state.notifications, { ...notif, id: crypto.randomUUID() }]
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  }))
}));