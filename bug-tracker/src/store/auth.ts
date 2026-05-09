import { create } from 'zustand';
import type { User, Session } from '../types';

interface AuthStore {
  user: User | null;
  session: Session | null;
  organizations: any[];
  currentOrgId: string | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setOrganizations: (orgs: any[]) => void;
  setCurrentOrgId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  organizations: [],
  currentOrgId: localStorage.getItem("currentOrgId"),
  isLoading: true,
  error: null,

  setUser: (user) => set({ user, error: null }),
  setSession: (session) => set({ session }),
  setOrganizations: (organizations) => set({ organizations }),
  setCurrentOrgId: (currentOrgId) => {
    if (currentOrgId) localStorage.setItem("currentOrgId", currentOrgId);
    else localStorage.removeItem("currentOrgId");
    set({ currentOrgId });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  logout: () => {
    set({ user: null, session: null, error: null });
    localStorage.removeItem("session");
  },
}));
