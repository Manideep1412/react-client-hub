import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../types';

// Stable localStorage mock that survives vi.resetModules()
const _store: Record<string, string> = {};
const localStorageMock = {
  getItem:    vi.fn((k: string) => _store[k] ?? null),
  setItem:    vi.fn((k: string, v: string) => { _store[k] = v; }),
  removeItem: vi.fn((k: string) => { delete _store[k]; }),
  clear:      vi.fn(() => { Object.keys(_store).forEach(k => delete _store[k]); }),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const MOCK_USER: User = {
  id: 1, email: 'alice@test.com', fullName: 'Alice', role: 'Agent', isOnline: false,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('initializes with null when localStorage is empty', async () => {
    const { useAuthStore } = await import('./authStore');
    const { token, user } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  it('initializes token and user from localStorage on module load', async () => {
    _store['ch_token'] = 'saved-token';
    _store['ch_user']  = JSON.stringify(MOCK_USER);
    const { useAuthStore } = await import('./authStore');
    expect(useAuthStore.getState().token).toBe('saved-token');
    expect(useAuthStore.getState().user).toEqual(MOCK_USER);
  });

  it('setAuth persists token and user to state and localStorage', async () => {
    const { useAuthStore } = await import('./authStore');
    useAuthStore.getState().setAuth('tok-123', MOCK_USER);
    expect(useAuthStore.getState().token).toBe('tok-123');
    expect(useAuthStore.getState().user).toEqual(MOCK_USER);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('ch_token', 'tok-123');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('ch_user', JSON.stringify(MOCK_USER));
  });

  it('logout clears token and user from state and localStorage', async () => {
    const { useAuthStore } = await import('./authStore');
    useAuthStore.getState().setAuth('tok-123', MOCK_USER);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('ch_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('ch_user');
  });

  it('logout is a no-op when already logged out', async () => {
    const { useAuthStore } = await import('./authStore');
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('ch_token');
  });
});
