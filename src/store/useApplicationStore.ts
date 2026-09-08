import { create } from 'zustand';
import { Application, Internship, Job } from '../types';
import { api } from '../services/api';

interface ApplicationState {
  myApplications: Application[];
  bookmarkedIds: string[];
  isLoading: boolean;
  fetchMyApplications: (userId?: string) => Promise<void>;
  applyForOpportunity: (params: {
    opportunityId: string;
    userId: string;
    type: 'internship' | 'job';
    coverNote?: string;
    studentName?: string;
    studentEmail?: string;
  }) => Promise<void>;
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  myApplications: [],
  bookmarkedIds: [],
  isLoading: false,

  fetchMyApplications: async (userId?: string) => {
    set({ isLoading: true });
    try {
      const res = await api.applications.getMyApplications(userId);
      set({ myApplications: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  applyForOpportunity: async ({ opportunityId, userId, type, coverNote, studentName, studentEmail }) => {
    set({ isLoading: true });
    try {
      if (type === 'internship') {
        const res = await api.internships.apply({ opportunityId, userId, coverNote, studentName, studentEmail });
        set({ myApplications: [res.data, ...get().myApplications], isLoading: false });
      } else {
        const res = await api.jobs.apply({ opportunityId, userId, coverNote, studentName, studentEmail });
        set({ myApplications: [res.data, ...get().myApplications], isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  toggleBookmark: (id: string) => {
    const exists = get().bookmarkedIds.includes(id);
    if (exists) {
      set({ bookmarkedIds: get().bookmarkedIds.filter((b) => b !== id) });
    } else {
      set({ bookmarkedIds: [...get().bookmarkedIds, id] });
    }
  },

  isBookmarked: (id: string) => {
    return get().bookmarkedIds.includes(id);
  }
}));
