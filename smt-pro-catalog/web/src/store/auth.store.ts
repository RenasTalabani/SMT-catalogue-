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
            localStorage.setItem('smt_token',   token);
            localStorage.setItem('smt_role',    user.role);
            localStorage.setItem('smt_user_id', String(user.id));
          }
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('smt_token');
          localStorage.removeItem('smt_role');
          localStorage.removeItem('smt_user_id');
        }
        set({ user: null, token: null });
      },
    }),
    {
      name:    'smt-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);
