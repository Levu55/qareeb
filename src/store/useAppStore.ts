import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCnicStatus, type CnicStatus } from '../lib/authHelpers';

export type Role = 'guest' | 'user' | 'helper' | 'admin' | 'superadmin';
export type Language = 'en' | 'ur';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  role: Role;
  language: Language;
  userName: string;
  phone: string;
  user: any | null;
  session: any | null;
  cnicStatus: CnicStatus;
  isHelper: boolean;
  helperServices: string[];
  toasts: ToastMessage[];
  setRole: (role: Role) => void;
  setLanguage: (lang: Language) => void;
  setCnicStatus: (status: CnicStatus) => void;
  setUser: (user: any, session?: any) => void;
  login: (role: Role, name: string, phone?: string, user?: any, session?: any) => void;
  logout: () => void;
  registerAsHelper: (services?: string[]) => void;
  switchRole: (role: Role) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: 'guest',
      language: 'en',
      userName: '',
      phone: '',
      user: null,
      session: null,
      cnicStatus: 'unverified',
      isHelper: false,
      helperServices: [],
      toasts: [],
      setRole: (role) => set({ role }),
      setLanguage: (language) => set({ language }),
      setCnicStatus: (cnicStatus) => set({ cnicStatus }),
      setUser: (user, session = null) => set((state) => ({
        user,
        session,
        userName: user?.user_metadata?.full_name || state.userName,
        phone: user?.phone || user?.user_metadata?.phone || state.phone,
        cnicStatus: user ? getCnicStatus(user) : state.cnicStatus,
      })),
      login: (role, userName, phone = '', user = null, session = null) => set((state) => ({
        role,
        userName,
        phone: phone || user?.phone || state.phone,
        user: user || state.user,
        session: session || state.session,
        isHelper: role === 'helper' ? true : state.isHelper,
      })),
      logout: () => set({
        role: 'guest',
        userName: '',
        phone: '',
        user: null,
        session: null,
        cnicStatus: 'unverified',
      }),
      registerAsHelper: (services = []) => set({ isHelper: true, role: 'helper', helperServices: services }),
      switchRole: (role) => set({ role }),
      addToast: (message, type = 'success') => set((state) => {
        const id = Math.random().toString(36).substr(2, 9);
        return { toasts: [...state.toasts, { id, message, type }] };
      }),
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      })),
    }),
    {
      name: 'qareeb-app-storage',
      partialize: (state) => ({ 
        role: state.role, 
        language: state.language, 
        userName: state.userName,
      }), // Don't persist toasts
    }
  )
);
