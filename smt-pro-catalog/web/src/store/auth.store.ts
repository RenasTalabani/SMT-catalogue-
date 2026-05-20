import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id:    number;
  name:  string;
  email: string;
  role:  string;
}

interface AuthState {
  user:      User | null;
  token:     string | null;
  isLoading: boolean;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:      null,
      token:     null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post<{ data: { token: string; user: User } }>(
            '/auth/login',
            { email, password },
          );
          const { token, user } = res.data.data;
          if (typeof window !== 'undefined') {
            localStorage.setItem('daraliraq_token',   token);
            localStorage.setItem('daraliraq_role',    user.role);
            localStorage.setItem('daraliraq_user_id', String(user.id));
          }
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('daraliraq_token');
          localStorage.removeItem('daraliraq_role');
          localStorage.removeItem('daraliraq_user_id');
        }
        set({ user: null, token: null });
      },
    }),
    {
      name:    'daraliraq-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);
