import { create } from 'zustand';
import { Notification } from '../types';
import { api } from '../services/api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  addNotification: (notif: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await api.notifications.getAll();
      const mapped = (res.data || []).map((n: any) => ({
        ...n,
        id: (n.id || n._id)?.toString(),
      }));
      const unread = mapped.filter((n: any) => !n.read).length;
      set({ notifications: mapped, unreadCount: unread, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await api.notifications.getUnreadCount();
      if (typeof res.data?.count === 'number') {
        set({ unreadCount: res.data.count });
      }
    } catch {
      // Fallback silently
    }
  },

  addNotification: (notif: Notification) => {
    const formatted: Notification = {
      ...notif,
      id: (notif.id || (notif as any)._id)?.toString(),
    };
    const current = get().notifications;
    const exists = current.some((n) => n.id === formatted.id);
    if (!exists) {
      set({
        notifications: [formatted, ...current],
        unreadCount: get().unreadCount + (formatted.read ? 0 : 1),
      });
    }
  },

  markAsRead: async (id: string) => {
    await api.notifications.markAsRead(id);
    const updated = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    set({
      notifications: updated,
      unreadCount: updated.filter((n) => !n.read).length,
    });
  },

  markAllAsRead: async () => {
    await api.notifications.markAllAsRead();
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({
      notifications: updated,
      unreadCount: 0,
    });
  },

  clearAll: async () => {
    await api.notifications.clearAll();
    set({
      notifications: [],
      unreadCount: 0,
    });
  },
}));
