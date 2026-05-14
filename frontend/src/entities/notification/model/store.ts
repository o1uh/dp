import { create } from 'zustand';

interface NotificationPayload {
  id: string;
  event: string;
  message: string;
  status: string;
  task_id?: string;
}

interface NotificationState {
  notifications: NotificationPayload[];
  readyTasks: NotificationPayload[];
  addNotification: (notification: Omit<NotificationPayload, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  readyTasks: [],
  addNotification: (notif) => set((state) => {
    const newNotif = { ...notif, id: crypto.randomUUID() };
    return {
      notifications: [...state.notifications, newNotif],
      readyTasks: notif.event === 'TrackReady' && notif.status === 'completed' 
        ? [...state.readyTasks, newNotif] 
        : state.readyTasks
    };
  }),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  }))
}));