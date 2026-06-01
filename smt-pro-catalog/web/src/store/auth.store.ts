import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { resetSocket } from '@/lib/socket';

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
            // Persist to cookies for Next.js edge middleware route guards
            document.cookie = `daraliraq_token=${token}; path=/; SameSite=Lax`;
            document.cookie = `daraliraq_role=${user.role}; path=/; SameSite=Lax`;
          }
          resetSocket(); // reconnect with fresh credentials
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
          // Clear edge-middleware cookies
          document.cookie = 'daraliraq_token=; path=/; max-age=0';
          document.cookie = 'daraliraq_role=; path=/; max-age=0';
        }
        resetSocket();
        set({ user: null, token: null });
      },
    }),
    {
      name:    'daraliraq-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);
