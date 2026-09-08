import { create } from 'zustand';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  role: UserRole;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;
  error: string | null;
  login: (email: string, password?: string, role?: UserRole) => Promise<void>;
  signup: (data: Partial<User>) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('ayush_portal_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const savedToken = localStorage.getItem('ayush_portal_token') || null;
const savedUser = getStoredUser();
const savedRole = (localStorage.getItem('ayush_portal_role') as UserRole) || savedUser?.role || 'student';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: savedUser,
  role: savedRole,
  token: savedToken,
  // Hydrate isAuthenticated only if both token and user profile exist
  isAuthenticated: !!(savedToken && savedUser),
  isLoading: false,
  isCheckingAuth: !!savedToken,
  error: null,

  checkAuth: async () => {
    const token = localStorage.getItem('ayush_portal_token');
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null, isCheckingAuth: false });
      return;
    }
    set({ isCheckingAuth: true });
    try {
      const res = await api.auth.getMe();
      if (res.data?.user) {
        localStorage.setItem('ayush_portal_user', JSON.stringify(res.data.user));
        localStorage.setItem('ayush_portal_role', res.data.user.role);
        set({
          user: res.data.user,
          role: res.data.user.role,
          isAuthenticated: true,
          isCheckingAuth: false,
        });
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        // Explicitly unauthorized / token expired
        localStorage.removeItem('ayush_portal_token');
        localStorage.removeItem('ayush_portal_role');
        localStorage.removeItem('ayush_portal_user');
        set({ user: null, token: null, isAuthenticated: false, isCheckingAuth: false });
      } else {
        // Network connectivity issue or transient backend unreachable: keep cached offline session intact
        set({ isCheckingAuth: false });
      }
    }
  },

  login: async (email: string, password?: string, role: UserRole = 'student') => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.auth.login(email, password, role);
      localStorage.setItem('ayush_portal_role', res.data.user.role);
      localStorage.setItem('ayush_portal_token', res.data.token);
      localStorage.setItem('ayush_portal_user', JSON.stringify(res.data.user));
      set({
        user: res.data.user,
        role: res.data.user.role,
        token: res.data.token,
        isAuthenticated: true,
        isLoading: false,
        isCheckingAuth: false,
        error: null,
      });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  signup: async (data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.auth.signup(data);
      localStorage.setItem('ayush_portal_role', res.data.user.role);
      localStorage.setItem('ayush_portal_token', res.data.token);
      localStorage.setItem('ayush_portal_user', JSON.stringify(res.data.user));
      set({
        user: res.data.user,
        role: res.data.user.role,
        token: res.data.token,
        isAuthenticated: true,
        isLoading: false,
        isCheckingAuth: false,
        error: null,
      });
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('ayush_portal_role');
    localStorage.removeItem('ayush_portal_token');
    localStorage.removeItem('ayush_portal_user');
    set({
      user: null,
      role: 'student',
      token: null,
      isAuthenticated: false,
      isCheckingAuth: false,
      error: null,
    });
  },

  updateProfile: async (updates: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;
    set({ isLoading: true });
    try {
      const res = await api.users.updateProfile(currentUser.id, updates);
      localStorage.setItem('ayush_portal_user', JSON.stringify(res.data));
      set({ user: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  uploadAvatar: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.users.uploadAvatar(file);
      set((state) => {
        const updated = state.user ? { ...state.user, profilePicture: res.data.profilePicture } : state.user;
        if (updated) {
          localStorage.setItem('ayush_portal_user', JSON.stringify(updated));
        }
        return {
          user: updated,
          isLoading: false,
        };
      });
    } catch (err: any) {
      set({ error: err.message || 'Avatar upload failed', isLoading: false });
      throw err;
    }
  },

  removeAvatar: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.users.removeAvatar();
      set((state) => {
        const updated = state.user ? { ...state.user, profilePicture: '' } : state.user;
        if (updated) {
          localStorage.setItem('ayush_portal_user', JSON.stringify(updated));
        }
        return {
          user: updated,
          isLoading: false,
        };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to remove avatar', isLoading: false });
      throw err;
    }
  },
}));
