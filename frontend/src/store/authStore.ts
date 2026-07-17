import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

const savedToken = localStorage.getItem('ch_token');
const savedUser  = localStorage.getItem('ch_user');

export const useAuthStore = create<AuthState>(set => ({
  token: savedToken,
  user:  savedUser ? JSON.parse(savedUser) : null,
  setAuth: (token, user) => {
    localStorage.setItem('ch_token', token);
    localStorage.setItem('ch_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('ch_token');
    localStorage.removeItem('ch_user');
    set({ token: null, user: null });
  },
}));
