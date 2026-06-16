import { get } from 'svelte/store';
import { auth } from './stores/auth';

const API_BASE = ''; // Set your backend URL here if needed

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const authState = get(auth);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authState?.token) {
    headers['Authorization'] = `Bearer ${authState.token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Auto-refresh on 401
  if (res.status === 401 && authState?.token) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        const newToken = data?.data?.accessToken;
        const user = data?.data?.user;
        if (newToken) {
          auth.set({ token: newToken, user: user || authState.user, loading: false });
          headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(url, { ...options, headers, credentials: 'include' });
        }
      }
    } catch (e) {
      console.error('Refresh failed', e);
    }
    auth.set({ token: null, user: null, loading: false });
  }

  return res;
}
