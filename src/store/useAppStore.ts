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
  isHelper: boolean;
  helperServices: string[];
  tasks: Task[];
  toasts: ToastMessage[];
  setRole: (role: Role) => void;
  setLanguage: (lang: Language) => void;
  setWalletBalance: (balance: number) => void;
  login: (role: Role, name: string) => void;
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
      isHelper: false,
      helperServices: [],
      tasks: [],
      toasts: [],
      setRole: (role) => set({ role }),
      setLanguage: (language) => set({ language }),
      setWalletBalance: (walletBalance) => set({ walletBalance }),
      login: (role, userName) => set((state) => ({ role, userName, isHelper: role === 'helper' ? true : state.isHelper })),
      logout: () => set({ role: 'guest', userName: '', walletBalance: 0 }),
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
