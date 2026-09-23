import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'guest' | 'user' | 'helper' | 'admin' | 'superadmin';
export type Language = 'en' | 'ur';

export interface Task {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  budget: string;
  status: 'searching' | 'assigned' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  role: Role;
  language: Language;
  walletBalance: number;
  userName: string;
  phone: string;
  user: any | null;
  session: any | null;
  cnicStatus: 'unverified' | 'pending' | 'approved' | 'rejected';
  isHelper: boolean;
  helperServices: string[];
  tasks: Task[];
  toasts: ToastMessage[];
  setRole: (role: Role) => void;
  setLanguage: (lang: Language) => void;
  setWalletBalance: (balance: number) => void;
  setCnicStatus: (status: 'unverified' | 'pending' | 'approved' | 'rejected') => void;
  setUser: (user: any, session?: any) => void;
  login: (role: Role, name: string, phone?: string, user?: any, session?: any) => void;
  logout: () => void;
  registerAsHelper: (services?: string[]) => void;
  switchRole: (role: Role) => void;
  postTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  updateTaskStatus: (id: string, status: Task['status']) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: 'guest',
      language: 'en',
      walletBalance: 1250,
      userName: '',
      phone: '',
      user: null,
      session: null,
      cnicStatus: 'unverified',
      isHelper: false,
      helperServices: [],
      tasks: [],
      toasts: [],
      setRole: (role) => set({ role }),
      setLanguage: (language) => set({ language }),
      setWalletBalance: (walletBalance) => set({ walletBalance }),
      setCnicStatus: (cnicStatus) => set({ cnicStatus }),
      setUser: (user, session = null) => set((state) => ({
        user,
        session,
        userName: user?.user_metadata?.full_name || state.userName,
        phone: user?.phone || user?.user_metadata?.phone || state.phone,
        cnicStatus: user?.user_metadata?.cnic_status || state.cnicStatus,
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
        walletBalance: 0,
      }),
      registerAsHelper: (services = []) => set({ isHelper: true, role: 'helper', helperServices: services }),
      switchRole: (role) => set({ role }),
      postTask: (taskData) => set((state) => ({
        tasks: [
          {
            ...taskData,
            id: Math.random().toString(36).substr(2, 9),
            status: 'searching',
            createdAt: Date.now(),
          },
          ...state.tasks
        ]
      })),
      updateTaskStatus: (id, status) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, status } : t)
      })),
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
        walletBalance: state.walletBalance, 
        userName: state.userName, 
        tasks: state.tasks 
      }), // Don't persist toasts
    }
  )
);

// @ts-ignore
window.useAppStore = useAppStore;
